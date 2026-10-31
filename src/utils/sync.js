// 与后端同步
// 连不上 /api/ping → 纯本地模式；连得上 → 共享模式
// 共享模式下必须登录：服务端只下发「这个人该看的」那部分数据
import { SHARED_KEYS, sharedSnapshot, applyShared, setPersistHook, setRemoteLoginHook } from './store.js'
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
    const mapA = new Map(a.map((x) => [x.id, x]))
    const mapB = new Map(b.map((x) => [x.id, x]))
    const upsert = []
    b.forEach((item) => {
      const old = mapA.get(item.id)
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) upsert.push(item)
    })
    const remove = []
    a.forEach((item) => {
      if (!mapB.has(item.id)) remove.push(item.id)
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

function startPolling() {
  if (polling) return
  polling = setInterval(async () => {
    // 本地还有没推上去的改动，先不拉，避免覆盖
    if (hasPending()) return
    const res = await get('/api/state?since=' + version)
    if (!res || res.unchanged || !res.data) return
    if (res.version > version) {
      version = res.version
      applyShared(res.data)
      lastSent = sharedSnapshot()
      emitSync()
    }
  }, 4000)
}

// 登录后拉一次「自己的那份数据」
export async function pullState() {
  const res = await get('/api/state')
  if (!res) return false
  if (res.__needLogin || res.__needKey) return false

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

  const p = await ping()
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
