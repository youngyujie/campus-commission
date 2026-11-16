// 与后端同步
// 连不上 /api/ping → 纯本地模式；连得上 → 共享模式
// 共享模式下必须登录：服务端只下发「这个人该看的」那部分数据
import { SHARED_KEYS, sharedSnapshot, applyShared, setPersistHook, setRemoteLoginHook, logout } from './store.js'
import {
  setBase,
  setKey,
  getKey,
  setRemote,
  setToken,
  loadToken,
  getToken,
  setServerUp,
  get,
  call,
  ping
} from './api.js'

const KEY_STORE = 'cc_access_key_v1'

let enabled = false
let version = 0
let lastSent = null
let pushTimer = null
let polling = null
let needKey = false
let needLogin = false

function resolveBase() {
  try {
    // 支持用 ?api=https://你的服务器 指定后端，静态托管时也能连自己的服务器
    const q = new URLSearchParams(location.search || '')
    const given = q.get('api')
    if (given) return String(given).replace(/\/+$/, '')
    return location.origin
  } catch (e) {
    return ''
  }
}

// 口令来源：优先 URL 里的 ?key=，其次本地记住的
function resolveKey() {
  try {
    const q = new URLSearchParams(location.search || '')
    const k = q.get('key')
    if (k) {
      try {
        uni.setStorageSync(KEY_STORE, String(k))
      } catch (e) {
        /* 忽略 */
      }
      return String(k)
    }
  } catch (e) {
    /* 忽略 */
  }
  try {
    return String(uni.getStorageSync(KEY_STORE) || '')
  } catch (e) {
    return ''
  }
}

export function saveKey(k) {
  const v = String(k || '').trim()
  try {
    uni.setStorageSync(KEY_STORE, v)
  } catch (e) {
    /* 忽略 */
  }
  setKey(v)
  needKey = false
}

export function keyMissing() {
  return needKey
}

export function loginMissing() {
  return needLogin
}

function emitSync() {
  try {
    uni.$emit('state:sync')
  } catch (e) {
    /* 忽略 */
  }
}

function diffChanges(prev, now) {
  const changes = {}
  SHARED_KEYS.forEach((name) => {
    const a = (prev && prev[name]) || []
    const b = now[name] || []
    // 有的集合（categories）用 key 而不是 id，统一取一个主键，否则会永远被判为「有改动」
    const pk = (x) => (x.id !== undefined && x.id !== null ? x.id : x.key)
    const mapA = new Map(a.map((x) => [pk(x), x]))
    const mapB = new Map(b.map((x) => [pk(x), x]))
    const upsert = []
    b.forEach((item) => {
      const old = mapA.get(pk(item))
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) upsert.push(item)
    })
    const remove = []
    a.forEach((item) => {
      if (!mapB.has(pk(item))) remove.push(pk(item))
    })
    if (upsert.length || remove.length) changes[name] = { upsert, remove }
  })
  if (now.seq !== undefined && (!prev || prev.seq !== now.seq)) {
    changes.scalars = { seq: now.seq }
  }
  return changes
}

function hasPending() {
  if (!enabled || !lastSent) return false
  return Object.keys(diffChanges(lastSent, sharedSnapshot())).length > 0
}

async function pushNow() {
  if (!enabled) return
  const now = sharedSnapshot()
  const changes = diffChanges(lastSent, now)
  if (!Object.keys(changes).length) return
  const res = await call('/api/sync', { changes })
  if (res && res.ok) {
    version = res.version
    lastSent = now
  } else if (res && res.__conflict) {
    await initServer(now)
  }
}

async function initServer(snapshot) {
  const res = await call('/api/state', { data: snapshot })
  if (res && res.ok) {
    version = res.version || 1
    lastSent = snapshot
  }
}

export function schedulePush() {
  if (!enabled) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushNow()
  }, 350)
}

// 轻量内容签名：集合数量 + 任务状态 + seq。用来判断远端数据到底变没变，
// 不能只看 version —— 并发写入后版本号可能被推高，但本端还没拉到别人的改动。
function snapshotKey(s) {
  const tasks = (s.tasks || [])
    .map((t) => t.id + ':' + t.status + ':' + (t.assigneeId || '') + ':' + (t.title || ''))
    .join('|')
  // 用户的封禁 / 角色 / 信誉分变化也要能同步到其它设备
  const users = (s.users || [])
    .map((u) => u.id + ':' + (u.status || '') + ':' + (u.role || '') + ':' + (u.credit || 0))
    .join('|')
  const counts = SHARED_KEYS.map((k) => (s[k] || []).length).join(',')
  return counts + '#' + tasks + '#' + users + '#' + (s.seq || 0)
}

function startPolling() {
  if (polling) return
  polling = setInterval(async () => {
    // 本地还有没推上去的改动，先不拉，避免覆盖
    if (hasPending()) return
    // 始终拉全量，按内容判断是否变化（避免漏掉并发写入）
    const res = await get('/api/state')
    if (!res || !res.data) return
    // 请求期间本地又产生了新改动 → 丢弃这次结果
    if (hasPending()) return
    // 过期响应（版本比本端还旧）→ 丢弃，避免把刚发布的内容覆盖掉
    if (typeof res.version === 'number' && res.version < version) return
    if (snapshotKey(res.data) === snapshotKey(sharedSnapshot())) {
      if (typeof res.version === 'number') version = res.version
      return
    }
    version = res.version
    applyShared(res.data)
    lastSent = sharedSnapshot()
    emitSync()
  }, 4000)
}

// 登录后拉一次「自己的那份数据」
export async function pullState() {
  const res = await get('/api/state')
  if (!res) return false
  if (res.__needLogin) {
    // 会话已失效：连本地登录态一起清掉，否则页面以为自己还登录着，
    // 所有接口却一直返回「请先登录」，卡在半登录状态。
    logout()
    return false
  }
  if (res.__needKey) return false

  enabled = true
  needLogin = false
  setRemote(true)
  setPersistHook(schedulePush)

  if (res.data) {
    applyShared(res.data)
    version = res.version
    lastSent = sharedSnapshot()
  } else {
    version = res.version || 0
    lastSent = sharedSnapshot()
  }
  startPolling()
  emitSync()
  console.log('[同步] 已拉取个人数据，版本', version)
  return true
}

export async function bootstrap() {
  const b = resolveBase()
  setBase(b)
  setKey(resolveKey())
  loadToken()

  // 登录成功之后要拉数据，把钩子交给 store
  setRemoteLoginHook(pullState)

  // 冷启动 / 网络抖动：ping 失败后等 1.2 秒再试一次，避免误判成「本地模式」
  let p = await ping(6000)
  if (!p || !p.ok) {
    await new Promise((r) => setTimeout(r, 1200))
    p = await ping(8000)
  }
  if (!p || !p.ok) {
    enabled = false
    setServerUp(false)
    setRemote(false)
    console.log('[同步] 没检测到后端，使用纯本地模式')
    return false
  }
  setServerUp(true)

  // 服务端说这个口令不行（不管我们有没有带）→ 都要挡
  if (p.needKey) {
    needKey = true
    enabled = false
    setRemote(false)
    console.log('[同步] 后端需要访问口令')
    return 'needkey'
  }
  needKey = false

  // 空库：先把本地种子推上去，否则没人能登录
  if (!p.initialized) {
    await initServer(sharedSnapshot())
    needLogin = true
    return 'needlogin'
  }

  // 还没登录：不拉数据，等登录
  if (!getToken()) {
    needLogin = true
    return 'needlogin'
  }

  const ok = await pullState()
  if (!ok) {
    needLogin = true
    setToken('')
    return 'needlogin'
  }
  return true
}

// 只跑一次 bootstrap，App 和登录页共用同一个结果
let bootPromise = null
export function bootstrapOnce() {
  if (!bootPromise) bootPromise = bootstrap()
  return bootPromise
}

// 填了口令之后重新连一次
export async function reconnect(k) {
  saveKey(k)
  clearInterval(polling)
  polling = null
  return bootstrap()
}

export function syncStatus() {
  return { enabled, version, needKey, needLogin }
}

// 调试出口：排查「轮询没发」时看看到底哪里还有未推送的差异
if (typeof window !== 'undefined') {
  window.__ccSync = {
    status: () => ({
      enabled,
      version,
      pendingKeys: lastSent ? Object.keys(diffChanges(lastSent, sharedSnapshot())) : ['no-lastSent']
    }),
    localCounts: () => {
      const s = sharedSnapshot()
      return SHARED_KEYS.reduce((o, k) => ((o[k] = (s[k] || []).length), o), {})
    },
    sentCounts: () => {
      if (!lastSent) return null
      return SHARED_KEYS.reduce((o, k) => ((o[k] = (lastSent[k] || []).length), o), {})
    }
  }
}
