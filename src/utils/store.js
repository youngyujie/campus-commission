// 本地数据层：所有业务逻辑集中在这里，页面只负责展示
// 存储方案：uni.setStorageSync（H5 / 小程序通用），单机演示无需后端
import { ref } from 'vue'
import { seedState } from './seed.js'
import { readAccounts, writeAccounts } from './vault.js'
import { call, isRemote, isServerUp, setToken } from './api.js'
import {
  CATEGORIES,
  STATUS,
  statusOf,
  STEPS,
  auditOf,
  DISPUTE_STATUS,
  creditLevel,
  CREDIT_MIN_TO_TRADE,
  BUILDINGS,
  buildingOf,
  normalizeLocation,
  localizePlaceText,
  BANNED_KEYWORDS,
  RULES,
  TITLES,
  titleOf,
  BUDGET_MAX,
  ITEM_PRICE_MAX,
  DEPOSIT_MIN,
  DEPOSIT_MAX,
  requiredDeposit,
  SKILL_TAG_MAX_LEN,
  SKILL_TAG_MAX_COUNT,
  tint
} from './constants.js'

// 需要与后端同步的集合（sessionUserId 属于设备本地，不同步）
export const SHARED_KEYS = [
  'users',
  'tasks',
  'messages',
  'reviews',
  'notifications',
  'disputes',
  'announcements',
  'portfolios',
  'favorites',
  'reports',
  'friends',
  'ledger',
  'categories'
]

// 远端数据落地后自增，让页面上的 computed 重新求值
export const dataTick = ref(0)

let suppressPush = false
let persistHook = null

export function setPersistHook(fn) {
  persistHook = fn
}

const KEY = 'campus_commission_state_v2'
// 变更戳：用于多标签页/多窗口之间同步状态（另一个标签页写入后本页能感知）
const STAMP_KEY = 'campus_commission_stamp_v1'

let state = null
let stateStamp = 0

export function init() {
  if (state) return state
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw && typeof raw === 'object' && Array.isArray(raw.tasks) && raw.users && raw.users.length) {
      state = raw
      if (!Array.isArray(state.categories) || !state.categories.length) {
        state.categories = JSON.parse(JSON.stringify(CATEGORIES))
      }
      // 旧数据补字段
      if (!Array.isArray(state.friends)) state.friends = []
      if (!Array.isArray(state.ledger)) state.ledger = []
      if (!Array.isArray(state.portfolios)) state.portfolios = []
      if (!Array.isArray(state.reports)) state.reports = []
      mergeVault()
      migrateUsers()
      stateStamp = readStamp()
      return state
    }
  } catch (e) {
    // 存储损坏则重建
  }
  state = seedState()
  mergeVault()
  migrateUsers()
  persist()
  return state
}

function readStamp() {
  try {
    return Number(uni.getStorageSync(STAMP_KEY) || 0)
  } catch (e) {
    return 0
  }
}

// 旧账号兼容：老版本注册的用户没有 username 字段，用昵称/姓名/手机号补上，
// 这样老账号照样能用「用户名」登录，不会出现「账号不存在」。
// 历史头像上限：只存上传过的图片，emoji 不存
export const AVATAR_HISTORY_MAX = 8

function pushAvatarHistory(u, url) {
  const v = String(url || '')
  if (!u || v.indexOf('data:image') !== 0) return
  if (!Array.isArray(u.avatarHistory)) u.avatarHistory = []
  u.avatarHistory = u.avatarHistory.filter((x) => x !== v)
  u.avatarHistory.unshift(v)
  if (u.avatarHistory.length > AVATAR_HISTORY_MAX) {
    u.avatarHistory = u.avatarHistory.slice(0, AVATAR_HISTORY_MAX)
  }
}

// 演示账号的学号：它们的历史数据只有学号，这里补成「已完成认证」，避免演示时被拦
const DEMO_VERIFIED_IDS = ['2023010101', '2022010202', '2024010303', '2021010404', '2023020505']

function migrateUsers() {
  if (!state || !Array.isArray(state.users)) return
  let dirty = false
  state.users.forEach((u) => {
    if (!Array.isArray(u.avatarHistory)) {
      u.avatarHistory = []
      dirty = true
    }
    if (!u.username) {
      const fallback = u.nickname || u.name || u.phone || 'user' + String(u.id).replace(/\D/g, '')
      u.username = String(fallback).trim() || 'user' + String(u.id).replace(/\D/g, '')
      dirty = true
    }
    if (u.phone === undefined) {
      u.phone = ''
      dirty = true
    }
    if (u.email === undefined) {
      u.email = ''
      dirty = true
    }
    if (u.deposit === undefined) {
      u.deposit = 0
      dirty = true
    }
    // 演示账号补全认证（仅限种子里的演示学号，不影响真实用户）
    // 严格认证要求「学号+学校+真实姓名+身份证」四项齐全，演示账号也补齐，
    // 否则会被判为未认证而无法演示发单/接单。
    const isDemo = u.role !== 'admin' && DEMO_VERIFIED_IDS.indexOf(String(u.studentId || '').trim()) >= 0
    if (isDemo) {
      if (!u.verifiedAt) {
        u.verifiedAt = Date.now()
        dirty = true
      }
      if (!u.school) {
        u.school = '演示大学'
        dirty = true
      }
      if (!u.realName) {
        u.realName = u.nickname || u.name || '演示同学'
        dirty = true
      }
      if (!u.idCard) {
        u.idCard = '11010519491231002X'
        dirty = true
      }
    }
    // 技能标签统一成「单个 ≤4 字、去重、最多 8 个」，兼容老数据里超长的标签
    if (Array.isArray(u.skills) && u.skills.length) {
      const fixed = []
      u.skills.forEach((raw) => {
        const v = String(raw || '').trim().slice(0, SKILL_TAG_MAX_LEN).trim()
        if (v && fixed.indexOf(v) < 0 && fixed.length < SKILL_TAG_MAX_COUNT) fixed.push(v)
      })
      if (fixed.join('|') !== u.skills.join('|')) {
        u.skills = fixed
        dirty = true
      }
    }
  })
  if (dirty) persist()
}

// 另一个标签页改过数据 → 本页重新加载，避免读到旧状态
function syncFromStorage() {
  if (!state) return
  const st = readStamp()
  if (!st || st === stateStamp) return
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw && typeof raw === 'object' && Array.isArray(raw.tasks) && raw.users && raw.users.length) {
      state = raw
      stateStamp = st
    }
  } catch (e) {
    // 读失败就继续用内存里的
  }
}

// 把账号仓库里的账号合并进业务数据（仓库优先，保证注册过的账号一定能登录）
function mergeVault() {
  const accounts = readAccounts()
  if (!accounts.length) return
  accounts.forEach((acc) => {
    const i = state.users.findIndex((u) => u.id === acc.id)
    if (i >= 0) {
      state.users[i] = { ...state.users[i], ...acc }
    } else {
      state.users.push(acc)
    }
  })
}

function persist() {
  try {
    uni.setStorageSync(KEY, state)
    // 账号单独存一份仓库，业务数据被重置或应用更新后仍可登录。
    // 注意：共享模式下 users 是服务端脱敏后的数据（没有手机号/学号/密码），
    // 写进去会把仓库洗坏，导致「重复注册」查不出来，所以只在本地模式写。
    if (!isServerUp()) writeAccounts(state.users)
    stateStamp = Date.now()
    uni.setStorageSync(STAMP_KEY, stateStamp)
    if (!suppressPush && persistHook) persistHook()
  } catch (e) {
    console.error('存储失败', e)
  }
}

// 导出给同步层用的快照 / 落地
export function sharedSnapshot() {
  const out = {}
  SHARED_KEYS.forEach((k) => {
    out[k] = state[k]
  })
  out.seq = state.seq
  return JSON.parse(JSON.stringify(out))
}

export function applyShared(data) {
  if (!data) return
  suppressPush = true
  try {
    SHARED_KEYS.forEach((k) => {
      if (Array.isArray(data[k])) state[k] = data[k]
    })
    if (typeof data.seq === 'number') state.seq = data.seq
    // 服务端数据可能是旧版本写的，补一次字段（演示账号认证、技能标签等）
    migrateUsers()
    persist()
  } finally {
    suppressPush = false
  }
  dataTick.value++
}

export function resetAll() {
  const keepUsers = state ? JSON.parse(JSON.stringify(state.users)) : []
  const session = state ? state.sessionUserId : ''
  state = seedState()
  // 已注册账号不因重置而丢失
  keepUsers.forEach((u) => {
    const i = state.users.findIndex((x) => x.id === u.id)
    if (i >= 0) state.users[i] = u
    else state.users.push(u)
  })
  state.sessionUserId = session
  persist()
}

export function getState() {
  return init()
}

function nextId(prefix) {
  const s = init()
  s.seq += 1
  return prefix + s.seq
}

/* ==================== 账号 ==================== */

export function getUser(id) {
  return init().users.find((u) => u.id === id) || null
}

export function currentUser() {
  const s = init()
  syncFromStorage()
  return state.users.find((u) => u.id === state.sessionUserId) || null
}

export function isLoggedIn() {
  return !!currentUser()
}

// 未登录守卫：onLoad 和 onShow 都会调用，必须只跳一次，
// 否则第二次 reLaunch 会被取消并抛出未处理的 Promise 拒绝。
let redirecting = false
export function guardLogin() {
  if (currentUser()) return true
  if (!redirecting) {
    redirecting = true
    uni.reLaunch({
      url: '/pages/login/login',
      complete: () => {
        setTimeout(() => {
          redirecting = false
        }, 800)
      }
    })
  }
  return false
}

export function isAdmin() {
  const me = currentUser()
  return !!me && me.role === 'admin'
}

// 注册校验：用户名 2-12 位（中文/字母/数字/下划线）、手机号 11 位；
// 学号为选填（填了就必须合法且唯一）。不再要求校园邮箱。
export function validateCampusIdentity({ username, phone, studentId }) {
  const un = String(username || '').trim()
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_]{2,12}$/.test(un)) {
    return '用户名需 2-12 位，可用中文、字母、数字、下划线'
  }
  if (!/^1\d{10}$/.test(String(phone || '').trim())) return '请填写 11 位手机号'
  const sid = String(studentId || '').trim()
  if (sid && !/^\d{8,12}$/.test(sid)) return '学号应为 8-12 位数字（也可以先不填）'
  return ''
}

export async function register({ username, phone, studentId, password, nickname }) {
  const s = init()
  if (isServerUp()) {
    const r = await call('/api/register', {
      username: String(username || '').trim(),
      phone: String(phone || '').trim(),
      studentId: String(studentId || '').trim(),
      password: String(password || ''),
      nickname: String(nickname || '').trim()
    })
    if (r && r.ok && r.user) {
      if (r.token) setToken(r.token)
      upsertLocalUser(r.user)
      s.sessionUserId = r.user.id
      persist()
      if (remoteLoginHook) await remoteLoginHook()
      return { ok: true, msg: r.msg || '注册成功', user: r.user }
    }
    return { ok: false, msg: (r && r.msg) || '注册失败' }
  }
  const err = validateCampusIdentity({ username, phone, studentId })
  if (err) return { ok: false, msg: err }
  if (!password || String(password).length < 6) return { ok: false, msg: '密码至少 6 位' }

  const un = String(username || '').trim()
  const sid = String(studentId || '').trim()
  const ph = String(phone).trim()

  // 业务数据和账号仓库都查一遍（仓库里的账号更全）
  const vault = readAccounts()
  const all = s.users.concat(vault.filter((a) => !s.users.some((u) => u.id === a.id)))

  if (all.some((u) => String(u.username || '').toLowerCase() === un.toLowerCase())) {
    return { ok: false, msg: '这个用户名已被使用，换一个' }
  }
  if (sid && all.some((u) => String(u.studentId || '').trim() === sid)) {
    return { ok: false, msg: '这个学号已经注册过了，请直接登录' }
  }
  if (all.some((u) => String(u.phone || '').trim() === ph)) {
    return { ok: false, msg: '这个手机号已经注册过了，请直接登录' }
  }

  const user = {
    id: nextId('u'),
    username: un,
    studentId: sid,
    name: un,
    email: '',
    phone: ph,
    password: String(password),
    avatar: '🙂',
    nickname: (nickname || '').trim() || un,
    bio: '',
    skills: [],
    college: '',
    credit: 100,
    deposit: 0,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: Date.now()
  }
  s.users.push(user)
  s.sessionUserId = user.id
  persist()
  return { ok: true, msg: sid ? '注册成功' : '注册成功，补填学号后才能发单和接单', user }
}

// 登录：用户名 / 手机号 / 学号 任填其一（旧账号的邮箱与昵称也兼容）
// 登录成功后要拉「自己的那份数据」，由 sync.js 注入，避免循环引用
let remoteLoginHook = null
export function setRemoteLoginHook(fn) {
  remoteLoginHook = fn
}

// 服务端登录成功后，把返回的用户（不含密码）并进本地列表
function upsertLocalUser(u) {
  const s = init()
  if (!u || !u.id) return
  const i = s.users.findIndex((x) => x.id === u.id)
  if (i >= 0) {
    const pwd = s.users[i].password
    s.users[i] = Object.assign({}, u)
    if (pwd) s.users[i].password = pwd
  } else {
    s.users.push(Object.assign({}, u))
  }
}

export async function login({ account, password }) {
  const s = init()
  const key = String(account || '').trim()
  if (!key) return { ok: false, msg: '请填写用户名、手机号或学号' }

  // 共享模式：密码在服务端比对，客户端拿不到任何人的密码
  if (isServerUp()) {
    const r = await call('/api/login', { account: key, password: String(password || '') })
    if (r && r.ok && r.user) {
      if (r.token) setToken(r.token)
      upsertLocalUser(r.user)
      s.sessionUserId = r.user.id
      persist()
      if (remoteLoginHook) await remoteLoginHook()
      return { ok: true, msg: '登录成功', user: r.user }
    }
    return { ok: false, msg: (r && r.msg) || '登录失败' }
  }

  const lk = key.toLowerCase()
  const u = s.users.find((x) => {
    const cands = [x.username, x.studentId, x.phone, x.email, x.nickname, x.name]
    return cands.some((v) => v && String(v).trim().toLowerCase() === lk)
  })
  if (!u) return { ok: false, msg: '本机没有这个账号。数据只存在当前浏览器里，换设备或换浏览器都看不到之前的注册记录' }
  if (u.password !== String(password || '')) return { ok: false, msg: '密码不正确' }
  if (u.status === 'banned') return { ok: false, msg: '账号已被封禁，请联系管理员' }
  s.sessionUserId = u.id
  persist()
  return { ok: true, msg: '登录成功', user: u }
}

// 验证码登录（演示环境固定验证码 123456，不发送真实短信）
export async function loginByCode({ phone, code }) {
  const s = init()
  if (!/^1\d{10}$/.test(String(phone || ''))) return { ok: false, msg: '请输入 11 位手机号' }

  if (isServerUp()) {
    const r = await call('/api/login-code', { phone: String(phone).trim(), code: String(code || '') })
    if (r && r.ok && r.user) {
      if (r.token) setToken(r.token)
      upsertLocalUser(r.user)
      s.sessionUserId = r.user.id
      persist()
      if (remoteLoginHook) await remoteLoginHook()
      return { ok: true, msg: '登录成功', user: r.user }
    }
    return { ok: false, msg: (r && r.msg) || '登录失败' }
  }
  if (String(code) !== '123456') return { ok: false, msg: '验证码不正确（演示码 123456）' }
  const u = s.users.find((x) => x.phone === String(phone).trim())
  if (!u) return { ok: false, msg: '本机没有这个手机号的注册记录。数据只存在当前浏览器里，换设备或换浏览器都看不到之前的注册' }
  if (u.status === 'banned') return { ok: false, msg: '账号已被封禁，请联系管理员' }
  s.sessionUserId = u.id
  persist()
  return { ok: true, msg: '登录成功', user: u }
}

// 补填学号：需要手机验证码（演示环境固定 123456）
export function fillStudentId({ studentId, phone, code }) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const sid = String(studentId || '').trim()
  if (!/^\d{8,12}$/.test(sid)) return { ok: false, msg: '学号应为 8-12 位数字' }
  if (String(phone || '').trim() !== String(me.phone || '')) {
    return { ok: false, msg: '手机号与注册时填写的不一致' }
  }
  if (String(code) !== '123456') return { ok: false, msg: '验证码不正确（演示码 123456）' }

  const s = init()
  if (s.users.some((u) => u.studentId === sid && u.id !== me.id)) {
    return { ok: false, msg: '该学号已被其他账号使用' }
  }
  me.studentId = sid
  me.studentIdVerifiedAt = Date.now()
  persist()
  return { ok: true, msg: '学号已绑定' }
}

export function logout() {
  const s = init()
  s.sessionUserId = ''
  setToken('')
  persist()
}

export function updateProfile(patch) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }

  // 技能标签：单个最多 4 个字，最多 8 个，自动去重去空
  if (patch.skills !== undefined) {
    const list = (Array.isArray(patch.skills) ? patch.skills : [])
      .map((s) => String(s || '').trim())
      .filter(Boolean)
    const tooLong = list.find((s) => s.length > SKILL_TAG_MAX_LEN)
    if (tooLong) return { ok: false, msg: `标签「${tooLong}」超过 ${SKILL_TAG_MAX_LEN} 个字` }
    const uniq = []
    list.forEach((s) => {
      if (uniq.indexOf(s) < 0) uniq.push(s)
    })
    if (uniq.length > SKILL_TAG_MAX_COUNT) {
      return { ok: false, msg: `最多选 ${SKILL_TAG_MAX_COUNT} 个标签` }
    }
    patch.skills = uniq
  }

  ;['nickname', 'bio', 'avatar', 'skills', 'college'].forEach((k) => {
    if (patch[k] !== undefined) me[k] = patch[k]
  })
  persist()
  return { ok: true, msg: '已保存' }
}

// 头像：支持 emoji 或 base64 图片
export const AVATAR_MAX_LEN = 200000

export function setAvatarImage(dataUrl) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const d = String(dataUrl || '')
  if (d.indexOf('data:image') !== 0) return { ok: false, msg: '图片格式不支持' }
  if (d.length > AVATAR_MAX_LEN) return { ok: false, msg: '图片太大，换一张小一点的' }
  // 旧头像如果是上传的图片，存进历史（emoji 不算）
  pushAvatarHistory(me, me.avatar)
  me.avatar = d
  persist()
  return { ok: true, msg: '头像已更新' }
}

// 当前用户的历史头像（只含上传过的图片，最新在前）
export function avatarHistory() {
  const me = currentUser()
  if (!me) return []
  return Array.isArray(me.avatarHistory) ? me.avatarHistory.slice() : []
}

// 直接用某张历史头像
export function useAvatarFromHistory(url) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const d = String(url || '')
  if (d.indexOf('data:image') !== 0) return { ok: false, msg: '这张头像不可用' }
  if (!Array.isArray(me.avatarHistory) || me.avatarHistory.indexOf(d) < 0) {
    return { ok: false, msg: '历史里没有这张头像' }
  }
  // 当前头像也进历史，再把这位置顶
  pushAvatarHistory(me, me.avatar)
  me.avatar = d
  me.avatarHistory = me.avatarHistory.filter((x) => x !== d)
  me.avatarHistory.unshift(d)
  persist()
  return { ok: true, msg: '已换成这张头像' }
}

export function setAvatarEmoji(emoji) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  me.avatar = String(emoji || '🙂')
  persist()
  return { ok: true, msg: '头像已更新' }
}

export function toggleAccepting() {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  me.accepting = !me.accepting
  persist()
  return { ok: true, msg: me.accepting ? '已开启接单' : '已暂停接单', accepting: me.accepting }
}

export function creditOf(user) {
  return creditLevel(user ? user.credit : 60)
}

// 取学号：业务数据里没有就回退查账号仓库（账号仓库是权威来源，
// 避免业务数据被重建后已绑定的学号「丢失」，导致重复提示补填）
function studentIdOf(u) {
  if (!u) return ''
  if (u.studentId) return u.studentId
  const acc = readAccounts().find((a) => a.id === u.id)
  if (acc && acc.studentId) {
    u.studentId = acc.studentId
    return u.studentId
  }
  return ''
}

// ---------------- 学生认证 ----------------
// 认证通过后才允许发单 / 接单。学号只是认证里的一项。
// 只有「学号 + 学校 + 真实姓名 + 身份证号」四项全部填写并提交，才算已完成认证。
export function isVerified(user) {
  const u = user || currentUser()
  if (!u) return false
  if (u.role === 'admin') return true
  // 缺任何一项都不算认证通过（修复「只填学号就显示已认证」的问题）
  return !!(u.verifiedAt && studentIdOf(u) && u.school && u.realName && u.idCard)
}

// 是否还没完成认证（UI 用来决定要不要弹「去认证」）
export function needVerify(user) {
  const u = user || currentUser()
  return !!(u && !isVerified(u))
}

// 兼容旧调用名
export const needStudentId = needVerify

export function verificationOf(user) {
  const u = user || currentUser()
  if (!u) return { verified: false, studentId: '', school: '', realName: '', idCardMasked: '', verifiedAt: 0 }
  const idCard = String(u.idCard || '')
  return {
    verified: isVerified(u),
    studentId: studentIdOf(u) || '',
    school: u.school || '',
    realName: u.realName || '',
    idCardMasked: idCard ? idCard.slice(0, 4) + '**********' + idCard.slice(-4) : '',
    verifiedAt: Number(u.verifiedAt) || 0
  }
}

// 演示用的认证答案：评委照填即可
// 学号自动避开已被占用的（否则会触发「学号已被认证」），身份证是校验位合法的演示号
export function demoVerifyHints() {
  const me = currentUser()
  const s = init()
  const takenByOther = (id) =>
    s.users.some(
      (u) => u.id !== (me && me.id) && String(u.studentId || '').trim() === String(id || '').trim()
    )
  const own = String((me && me.studentId) || '').trim()
  let sid = own && !takenByOther(own) ? own : ''
  // 优先用手机号后 6 位生成，保证不同账号的演示学号不撞车
  if (!sid) {
    const ph = String((me && me.phone) || '').replace(/\D/g, '')
    if (ph.length >= 6) {
      const cand = '2024' + ph.slice(-6)
      if (!takenByOther(cand)) sid = cand
    }
  }
  if (!sid) {
    let n = 2024010101
    for (let i = 0; i < 3000; i++) {
      const cand = String(n + i)
      if (!takenByOther(cand)) {
        sid = cand
        break
      }
    }
  }
  let rn = (me && (me.realName || me.name || me.nickname)) || '演示同学'
  rn = String(rn).trim()
  if (rn.length < 2) rn = (rn || '演示') + '同学'
  return {
    studentId: sid || '2024010101',
    school: '演示大学',
    realName: rn,
    idCard: '11010519491231002X'
  }
}

// 提交学生认证
export function submitVerification({ studentId, school, realName, idCard }) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }

  // 认证一旦完成即锁定，不能自行修改，必须向管理员申请
  if (isVerified(me)) {
    return { ok: false, msg: '已完成学生认证，如需修改请联系管理员申请' }
  }

  const sid = String(studentId || '').trim()
  const sch = String(school || '').trim()
  const name = String(realName || '').trim()
  const id = String(idCard || '').trim().toUpperCase()

  if (!/^\d{8,12}$/.test(sid)) return { ok: false, msg: '学号应为 8-12 位数字' }
  if (sch.length < 2 || sch.length > 30) return { ok: false, msg: '请填写学校全称（2-30 字）' }
  if (name.length < 2 || name.length > 20) return { ok: false, msg: '请填写真实姓名（2-20 字）' }
  if (!/^\d{17}[\dX]$/.test(id)) return { ok: false, msg: '身份证号应为 18 位（最后一位可为 X）' }
  if (!checkIdCard(id)) return { ok: false, msg: '身份证号校验不通过，请检查' }

  // 学号唯一
  const s = init()
  const taken = s.users.find((u) => u.id !== me.id && String(u.studentId || '').trim() === sid)
  if (taken) return { ok: false, msg: '该学号已被其他账号认证' }

  me.studentId = sid
  me.school = sch
  me.realName = name
  me.idCard = id
  me.verifiedAt = Date.now()
  persist()
  return { ok: true, msg: '学生认证已通过' }
}

// 已认证用户申请修改认证信息：给所有管理员发一条通知
export function requestVerificationChange(note) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const s = init()
  const admins = s.users.filter((u) => u.role === 'admin')
  if (!admins.length) return { ok: false, msg: '暂时没有可联系的管理员' }
  const reason = String(note || '').trim()
  admins.forEach((a) =>
    notify(a.id, {
      type: 'audit',
      title: '学生认证修改申请',
      body: `${me.nickname || me.name}（${me.studentId || '无学号'}）申请修改学生认证信息${
        reason ? '：' + reason : ''
      }`
    })
  )
  persist()
  return { ok: true, msg: '已提交修改申请，请等待管理员处理' }
}

// 18 位身份证校验位
function checkIdCard(id) {
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const code = '10X98765432'
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(id[i]) * w[i]
  return code[sum % 11] === id[17]
}

// 是否允许发单 / 接单
export function tradeBlockReason(user) {
  const u = user || currentUser()
  if (!u) return '请先登录'
  if (u.role === 'admin') return '管理员账号不参与交易'
  if (u.status === 'banned') return '账号已被封禁'
  if (!isVerified(u)) return '请先完成学生认证'
  if (u.credit < CREDIT_MIN_TO_TRADE) return `信誉分低于 ${CREDIT_MIN_TO_TRADE}，暂时无法发单和接单`
  return ''
}

export function myStats(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  const published = s.tasks.filter((t) => t.publisherId === uid)
  const taken = s.tasks.filter((t) => t.assigneeId === uid)
  const done = [...published, ...taken].filter((t) => t.status === 'done')
  const about = s.reviews.filter((r) => r.toId === uid)
  const avg = about.length
    ? Math.round((about.reduce((sum, r) => sum + r.stars, 0) / about.length) * 10) / 10
    : 0
  return {
    publishedCount: published.length,
    takenCount: taken.length,
    doneCount: done.length,
    // 分开发布方/接单方各自的完成数，称号判定要用
    publishedDoneCount: published.filter(
      (t) => t.status === 'done' && t.assigneeId && t.assigneeId !== uid
    ).length,
    takenDoneCount: taken.filter((t) => t.status === 'done' && t.publisherId !== uid).length,
    reviewCount: about.length,
    avgStars: avg,
    activePublished: published.filter((t) =>
      ['pending', 'assigned', 'working', 'submitted'].includes(t.status)
    ).length,
    activeTaken: taken.filter((t) => ['assigned', 'working', 'submitted'].includes(t.status)).length
  }
}

/* ==================== 称号 ==================== */

// 计算某用户已解锁的称号（chu 永远有）
export function earnedTitles(user) {
  const u = user || currentUser()
  if (!u) return ['chu']
  const st = myStats(u.id)
  const earned = ['chu']
  // 校园之星：信誉 ≥ 95 且完成他人 10 条委托
  if (Number(u.credit) >= 95 && st.takenDoneCount >= 10) earned.push('zhi')
  // 校园之誉：信誉 ≥ 95 且发布 10 条委托并被他人完成
  if (Number(u.credit) >= 95 && st.publishedDoneCount >= 10) earned.push('yu')
  return earned
}

// 当前悬挂的称号（未设置或已失效则回落到「校园之初」）
export function currentTitleOf(user) {
  const u = user || currentUser()
  if (!u) return titleOf('chu')
  const earned = earnedTitles(u)
  const key = earned.indexOf(u.currentTitle) >= 0 ? u.currentTitle : 'chu'
  return titleOf(key)
}

// 切换称号（只能切换到已解锁的）
export function setCurrentTitle(key) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  if (earnedTitles(me).indexOf(key) < 0) return { ok: false, msg: '还没有获得这个称号' }
  me.currentTitle = key
  persist()
  return { ok: true, msg: '称号已切换' }
}

// 按用户 id 取称号（没有则返回默认）
export function titleOfUser(userId) {
  const u = userId ? getUser(userId) : currentUser()
  return currentTitleOf(u)
}

/* ==================== 分类 ==================== */

export function listCategories() {
  return init().categories
}

export function categoryOf(key) {
  const list = init().categories
  return list.find((c) => c.key === key) || list[list.length - 1]
}

export function addCategory({ name, emoji }) {
  const s = init()
  const n = String(name || '').trim()
  if (!n) return { ok: false, msg: '分类名不能为空' }
  if (s.categories.some((c) => c.name === n)) return { ok: false, msg: '分类已存在' }
  s.categories.push({
    key: 'c' + Date.now(),
    name: n,
    emoji: emoji || '📌',
    color: '#4C6FFF',
    soft: '#EEF1FF'
  })
  persist()
  return { ok: true, msg: '已添加分类' }
}

export function removeCategory(key) {
  const s = init()
  if (s.categories.length <= 1) return { ok: false, msg: '至少保留一个分类' }
  if (s.tasks.some((t) => t.category === key)) return { ok: false, msg: '该分类下还有委托，无法删除' }
  s.categories = s.categories.filter((c) => c.key !== key)
  persist()
  return { ok: true, msg: '已删除分类' }
}

/* ==================== 委托 ==================== */

function decorate(t) {
  const s = init()
  const cat = categoryOf(t.category)
  const st = statusOf(t.status)
  const au = auditOf(t.audit)
  const publisher = s.users.find((u) => u.id === t.publisherId) || null
  const assignee = t.assigneeId ? s.users.find((u) => u.id === t.assigneeId) || null : null
  // 旧数据里的虚构地址（松园/竹园/图书馆…）在展示时翻译成学校立体图里的地点
  const loc = normalizeLocation(t.place, t.building)
  return {
    ...t,
    place: loc.place,
    building: loc.building,
    title: localizePlaceText(t.title),
    desc: localizePlaceText(t.desc),
    cat,
    st,
    au,
    publisher,
    assignee,
    requiredDeposit: requiredDeposit(t.budget),
    budgetLabel: `¥${t.budget}`,
    itemPriceLabel: t.itemPrice ? `¥${t.itemPrice}` : '',
    deadlineLabel: deadlineLabel(t.deadline),
    createdLabel: timeAgo(t.createdAt),
    expired: t.deadline < Date.now() && t.status === 'pending',
    publisherName: t.anonymous
      ? '匿名同学'
      : publisher
        ? publisher.nickname || publisher.name
        : '未知',
    assigneeName: assignee ? assignee.nickname || assignee.name : ''
  }
}

export function listTasks(opts = {}) {
  const s = init()
  let arr = s.tasks.map(decorate)

  // 大厅默认只展示审核通过的
  if (opts.audit !== 'all') {
    arr = arr.filter((t) => t.audit === (opts.audit || 'approved'))
  }
  if (opts.category && opts.category !== 'all') arr = arr.filter((t) => t.category === opts.category)
  if (opts.building && opts.building !== 'all') arr = arr.filter((t) => t.building === opts.building)
  if (opts.status && opts.status !== 'all') arr = arr.filter((t) => t.status === opts.status)
  if (opts.publisherId) arr = arr.filter((t) => t.publisherId === opts.publisherId)
  if (opts.assigneeId) arr = arr.filter((t) => t.assigneeId === opts.assigneeId)
  if (opts.keyword) {
    const k = String(opts.keyword).trim().toLowerCase()
    if (k) {
      arr = arr.filter(
        (t) =>
          t.title.toLowerCase().includes(k) ||
          t.desc.toLowerCase().includes(k) ||
          t.place.toLowerCase().includes(k)
      )
    }
  }

  const sort = opts.sort || 'smart'
  if (sort === 'new') {
    arr.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sort === 'reward') {
    arr.sort((a, b) => b.budget - a.budget)
  } else if (sort === 'deadline') {
    arr.sort((a, b) => a.deadline - b.deadline)
  } else {
    // 智能排序：待接单优先 → 加急优先 → 新发布优先
    const weight = (t) =>
      t.status === 'pending' ? 0 : t.status === 'done' || t.status === 'cancelled' ? 2 : 1
    arr.sort((a, b) => {
      if (weight(a) !== weight(b)) return weight(a) - weight(b)
      if (!!b.urgent !== !!a.urgent) return b.urgent ? 1 : -1
      return b.createdAt - a.createdAt
    })
  }
  return arr
}

export function getTask(id) {
  const t = init().tasks.find((x) => x.id === id)
  return t ? decorate(t) : null
}

export function checkBanned(text) {
  const s = String(text || '')
  return BANNED_KEYWORDS.find((k) => s.includes(k)) || ''
}

export function createTask(payload) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const blocked = tradeBlockReason(me)
  if (blocked) {
    return { ok: false, msg: blocked, needStudentId: needStudentId(me) }
  }

  const budget = Number(payload.budget) || 0
  if (!(budget > 0)) return { ok: false, msg: '请填写订单报酬' }
  if (budget > BUDGET_MAX) return { ok: false, msg: `平台只做小额订单，报酬不能超过 ${BUDGET_MAX} 元` }

  const cat = categoryOf(payload.category)
  const itemPrice = Number(payload.itemPrice) || 0
  const proof = payload.proof || []
  if (cat.needItemPrice) {
    if (!(itemPrice > 0)) return { ok: false, msg: '代取代买类需填写商品价格' }
    if (itemPrice > ITEM_PRICE_MAX) return { ok: false, msg: `商品价格不能超过 ${ITEM_PRICE_MAX} 元` }
    if (!proof.length) return { ok: false, msg: '代取代买类需上传凭证（订单截图 / 小票）' }
  }

  // 系统直接检测违规内容：命中即拦截，不生成委托，并给发布者发整改通知
  const hit = checkBanned(`${payload.title} ${payload.desc}`)
  if (hit) {
    notify(me.id, {
      type: 'audit',
      title: '委托发布失败，请整改后重发',
      body: `你发布的委托「${String(payload.title || '').slice(0, 20)}」包含违规内容「${hit}」，系统已拦截，未对外发布。请修改标题或描述中的违规内容后重新发布。`
    })
    persist()
    return {
      ok: false,
      msg: `内容包含违规词「${hit}」，已拦截，请整改后重发`,
      banned: hit
    }
  }

  const task = {
    id: nextId('t'),
    title: payload.title,
    desc: payload.desc,
    category: payload.category,
    budget,
    itemPrice: cat.needItemPrice ? itemPrice : 0,
    proof: cat.needItemPrice ? proof : [],
    deadline: payload.deadline,
    place: payload.place,
    building: payload.building || 'apt16',
    attachments: payload.attachments || [],
    anonymous: !!payload.anonymous,
    urgent: !!payload.urgent,
    publisherId: me.id,
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    depositReturned: false,
    // 违规词已在发布前被系统拦下，内容合规的直接上架，其他人立刻能看到；
    // 管理员仍可在后台把违规委托下架（audit → rejected）
    audit: 'approved',
    auditReason: '',
    createdAt: Date.now()
  }
  s.tasks.unshift(task)

  s.users
    .filter((u) => u.role === 'admin')
    .forEach((a) =>
      notify(a.id, {
        type: 'audit',
        title: '有新的委托上架',
        body: `${me.nickname || me.name} 发布了「${task.title}」`,
        taskId: task.id
      })
    )
  persist()
  return { ok: true, msg: '发布成功，已在大厅上架', task }
}

export function cancelTask(id) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.publisherId !== me.id) return { ok: false, msg: '只有委托人可以取消' }
  if (!['pending', 'assigned', 'working'].includes(t.status)) {
    return { ok: false, msg: '当前状态无法取消' }
  }
  t.status = 'cancelled'
  t.cancelledAt = Date.now()
  me.credit = Math.max(0, me.credit - 2)
  if (t.assigneeId) {
    notify(t.assigneeId, {
      type: 'cancel',
      title: '委托已被取消',
      body: `「${t.title}」被委托人取消，你的信用不受影响`,
      taskId: t.id
    })
  }
  persist()
  return { ok: true, msg: '已取消，信誉分 -2' }
}

/* ==================== 押金与接单 ==================== */

// 我的押金余额
export function depositOf(user) {
  const u = user || currentUser()
  return u ? Number(u.deposit) || 0 : 0
}

// 模拟缴纳/补交押金（演示环境直接记账，不对接真实支付）
export function rechargeDeposit(amount) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const n = Number(amount)
  if (!(n > 0)) return { ok: false, msg: '请输入有效金额' }
  me.deposit = (Number(me.deposit) || 0) + n
  if (me.deposit > DEPOSIT_MAX) {
    const back = me.deposit - DEPOSIT_MAX
    me.deposit = DEPOSIT_MAX
    persist()
    return { ok: true, msg: `押金上限 ${DEPOSIT_MAX} 元，多缴的 ${back} 元未入账`, deposit: me.deposit }
  }
  persist()
  return { ok: true, msg: `已缴纳押金，当前余额 ${me.deposit} 元`, deposit: me.deposit }
}

// 接单前检查押金是否够（不够要补交）
export function depositCheck(taskId) {
  const me = currentUser()
  const t = init().tasks.find((x) => x.id === taskId)
  if (!me || !t) return { ok: false, msg: '数据异常' }
  const required = requiredDeposit(t.budget)
  const have = Number(me.deposit) || 0
  return {
    ok: have >= required,
    required,
    have,
    shortage: Math.max(0, required - have),
    msg:
      have >= required
        ? ''
        : `接这单需要 ${required} 元押金，你还差 ${required - have} 元，请先补交`
  }
}

// 自由接单：先缴押金（冻结），订单直接进入已接单
export function takeTask(id) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }

  const blocked = tradeBlockReason(me)
  if (blocked) {
    return { ok: false, msg: blocked, needStudentId: needStudentId(me) }
  }

  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '订单不存在' }
  if (t.status !== 'pending') return { ok: false, msg: '这单已经被接走了' }
  if (t.audit !== 'approved') return { ok: false, msg: '该订单还没通过审核' }
  if (t.publisherId === me.id) return { ok: false, msg: '不能接自己发布的订单' }
  if (!me.accepting) return { ok: false, msg: '你已暂停接单，请先在「我的」里打开' }

  const required = requiredDeposit(t.budget)
  const have = Number(me.deposit) || 0
  if (have < required) {
    return {
      ok: false,
      needDeposit: true,
      required,
      have,
      shortage: required - have,
      msg: `接这单需要 ${required} 元押金，你还差 ${required - have} 元`
    }
  }

  // 冻结押金
  me.deposit = have - required
  t.assigneeId = me.id
  t.status = 'assigned'
  t.deposit = required
  t.depositReturned = false
  t.takenAt = Date.now()

  notify(t.publisherId, {
    type: 'take',
    title: '有人接取了你的订单',
    body: `${me.nickname || me.name} 接取了「${t.title}」，已缴纳 ${required} 元押金`,
    taskId: t.id
  })
  persist()
  return { ok: true, msg: `接单成功，已冻结 ${required} 元押金` }
}


export function startWork(id) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.assigneeId !== me.id) return { ok: false, msg: '只有服务商可以开始任务' }
  if (t.status !== 'assigned') return { ok: false, msg: '当前状态无法开始' }
  t.status = 'working'
  t.startedAt = Date.now()
  notify(t.publisherId, {
    type: 'working',
    title: '服务商已开始处理',
    body: `「${t.title}」已进入进行中`,
    taskId: t.id
  })
  persist()
  return { ok: true, msg: '已开始，加油' }
}

export function submitDeliverable(id, { name, note, size }) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.assigneeId !== me.id) return { ok: false, msg: '只有服务商可以提交交付' }
  if (!['assigned', 'working'].includes(t.status)) return { ok: false, msg: '当前状态无法提交' }
  if (!String(name || '').trim()) return { ok: false, msg: '请填写交付物名称或说明' }

  t.status = 'submitted'
  t.submittedAt = Date.now()
  t.deliverable = {
    name: String(name).trim(),
    note: String(note || '').trim(),
    size: String(size || '').trim()
  }
  notify(t.publisherId, {
    type: 'deliver',
    title: '服务商已交付，等待你验收',
    body: `${me.nickname || me.name} 提交了「${t.title}」的交付成果`,
    taskId: t.id
  })
  persist()
  return { ok: true, msg: '已提交，等待委托人验收' }
}

export function acceptDeliverable(id) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.publisherId !== me.id) return { ok: false, msg: '只有委托人可以验收' }
  if (t.status !== 'submitted') return { ok: false, msg: '当前状态无法验收' }

  t.status = 'done'
  t.doneAt = Date.now()

  const publisher = s.users.find((u) => u.id === t.publisherId)
  const assignee = s.users.find((u) => u.id === t.assigneeId)
  if (publisher) publisher.credit = Math.min(100, publisher.credit + 2)
  if (assignee) assignee.credit = Math.min(100, assignee.credit + 2)

  // 记账：委托人支出、服务商收入（平台不碰资金，仅记账）
  if (publisher) addLedger(publisher.id, t.id, 'expense', t.budget, t.title)
  if (assignee) addLedger(assignee.id, t.id, 'income', t.budget, t.title)

  // 退还服务商押金
  if (assignee && t.deposit && !t.depositReturned) {
    assignee.deposit = (Number(assignee.deposit) || 0) + Number(t.deposit)
    t.depositReturned = true
  }

  if (assignee) {
    notify(assignee.id, {
      type: 'done',
      title: '委托已验收完成',
      body: `「${t.title}」已确认完成，双方信誉分各 +2`,
      taskId: t.id
    })
  }
  persist()
  return { ok: true, msg: '已验收，双方信誉分各 +2' }
}

/* ==================== 评价 ==================== */

export function reviewsOfTask(taskId) {
  const s = init()
  return s.reviews
    .filter((r) => r.taskId === taskId)
    .map((r) => ({ ...r, from: getUser(r.fromId), to: getUser(r.toId) }))
    .filter((r) => r.from && r.to)
}

export function reviewsAbout(userId) {
  const s = init()
  return s.reviews
    .filter((r) => r.toId === userId)
    .map((r) => ({ ...r, from: getUser(r.fromId) }))
    .filter((r) => r.from)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function hasReviewed(taskId, fromId) {
  return init().reviews.some((r) => r.taskId === taskId && r.fromId === fromId)
}

export function addReview({ taskId, stars, tags, text }) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === taskId)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.status !== 'done') return { ok: false, msg: '只有已完成的委托可以评价' }
  const toId = t.publisherId === me.id ? t.assigneeId : t.publisherId
  if (!toId) return { ok: false, msg: '找不到评价对象' }
  if (hasReviewed(taskId, me.id)) return { ok: false, msg: '你已经评价过了' }

  s.reviews.unshift({
    id: nextId('r'),
    taskId,
    fromId: me.id,
    toId,
    stars,
    tags: tags || [],
    text: String(text || '').trim(),
    createdAt: Date.now()
  })

  const target = s.users.find((u) => u.id === toId)
  if (target) {
    if (stars >= 4) target.credit = Math.min(100, target.credit + 3)
    else if (stars <= 2) target.credit = Math.max(0, target.credit - 3)
    notify(toId, {
      type: 'review',
      title: '你收到一条新评价',
      body: `${me.nickname || me.name} 给了你 ${stars} 星`,
      taskId
    })
  }
  persist()
  return { ok: true, msg: '评价已提交' }
}

/* ==================== 消息 ==================== */

// 订单交流区：公开留言，所有登录用户可见可发（toId 为空）
export function orderMessages(taskId) {
  const s = init()
  return s.messages
    .filter((m) => m.taskId === taskId && !m.toId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => {
      const from = getUser(m.fromId)
      return {
        ...m,
        from,
        mine: !!(currentUser() && currentUser().id === m.fromId),
        name: from ? from.nickname || from.name : '同学',
        avatar: from ? from.avatar : '🙂',
        timeLabel: clockLabel(m.createdAt)
      }
    })
}

export function sendOrderMessage(taskId, { text, image }) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const body = String(text || '').trim()
  if (!body && !image) return { ok: false, msg: '说点什么吧' }
  const t = s.tasks.find((x) => x.id === taskId)
  if (!t) return { ok: false, msg: '订单不存在' }

  s.messages.push({
    id: nextId('m'),
    taskId,
    fromId: me.id,
    toId: '',
    text: body,
    image: image || '',
    createdAt: Date.now()
  })

  // 通知订单另一方
  const otherId = t.publisherId === me.id ? t.assigneeId : t.publisherId
  if (otherId) {
    notify(otherId, {
      type: 'message',
      title: '订单交流区有新留言',
      body: `${me.nickname || me.name}：${body || '[图片]'}`,
      taskId
    })
  }
  persist()
  return { ok: true }
}

// 私聊会话列表（只统计一对一私聊）
export function conversations(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  const mine = s.messages.filter((m) => m.toId && (m.fromId === uid || m.toId === uid))
  const byOther = {}
  mine.forEach((m) => {
    const other = m.fromId === uid ? m.toId : m.fromId
    if (!byOther[other] || m.createdAt > byOther[other].createdAt) {
      byOther[other] = { otherId: other, createdAt: m.createdAt, text: m.text }
    }
  })
  return Object.values(byOther)
    .map((c) => ({
      ...c,
      other: getUser(c.otherId),
      timeLabel: timeAgo(c.createdAt)
    }))
    .filter((c) => c.other)
    .sort((a, b) => b.createdAt - a.createdAt)
}

// 与某人的私聊记录
export function messagesWith(otherId) {
  const s = init()
  const me = currentUser()
  if (!me) return []
  return s.messages
    .filter(
      (m) =>
        m.toId &&
        ((m.fromId === me.id && m.toId === otherId) || (m.fromId === otherId && m.toId === me.id))
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => ({ ...m, mine: m.fromId === me.id, timeLabel: clockLabel(m.createdAt) }))
}

// 发送私聊（受临时聊天 10 句限制）
export function sendMessage({ toId, text, image }) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const body = String(text || '').trim()
  if (!body && !image) return { ok: false, msg: '说点什么吧' }

  const perm = chatPermission(toId)
  if (!perm.ok) {
    return { ok: false, msg: perm.reason || '临时聊天已用完', needFriend: !perm.friend }
  }

  s.messages.push({
    id: nextId('m'),
    taskId: '',
    fromId: me.id,
    toId,
    text: body,
    image: image || '',
    createdAt: Date.now()
  })
  persist()
  return { ok: true }
}


/* ==================== 通知 ==================== */

export function notify(userId, { type, title, body, taskId }) {
  const s = init()
  s.notifications.unshift({
    id: nextId('n'),
    userId,
    type,
    title,
    body,
    taskId: taskId || '',
    read: false,
    createdAt: Date.now()
  })
}

export function notificationsOf(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  return s.notifications
    .filter((n) => n.userId === uid)
    .map((n) => ({ ...n, timeLabel: timeAgo(n.createdAt) }))
}

export function unreadCount(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  return s.notifications.filter((n) => n.userId === uid && !n.read).length
}

export function markAllRead(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  s.notifications.forEach((n) => {
    if (n.userId === uid) n.read = true
  })
  persist()
}

/* ==================== 收藏 / 举报 ==================== */

export function isFavoriteTask(taskId) {
  const me = currentUser()
  if (!me) return false
  return init().favorites.some((f) => f.userId === me.id && f.taskId === taskId)
}

export function isFavoriteProvider(providerId) {
  const me = currentUser()
  if (!me) return false
  return init().favorites.some((f) => f.userId === me.id && f.providerId === providerId)
}

export function toggleFavoriteTask(taskId) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const i = s.favorites.findIndex((f) => f.userId === me.id && f.taskId === taskId)
  if (i >= 0) {
    s.favorites.splice(i, 1)
    persist()
    return { ok: true, msg: '已取消收藏', on: false }
  }
  s.favorites.push({ id: nextId('f'), userId: me.id, taskId, createdAt: Date.now() })
  persist()
  return { ok: true, msg: '已收藏', on: true }
}

export function toggleFavoriteProvider(providerId) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  const i = s.favorites.findIndex((f) => f.userId === me.id && f.providerId === providerId)
  if (i >= 0) {
    s.favorites.splice(i, 1)
    persist()
    return { ok: true, msg: '已取消关注', on: false }
  }
  s.favorites.push({ id: nextId('f'), userId: me.id, providerId, createdAt: Date.now() })
  persist()
  return { ok: true, msg: '已关注该服务商', on: true }
}

export function favoriteTasks() {
  const s = init()
  const me = currentUser()
  if (!me) return []
  return s.favorites
    .filter((f) => f.userId === me.id && f.taskId)
    .map((f) => {
      const t = s.tasks.find((x) => x.id === f.taskId)
      return t ? decorate(t) : null
    })
    .filter(Boolean)
}

export function addReport({ targetType, targetId, reason }) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  if (!String(reason || '').trim()) return { ok: false, msg: '请填写举报原因' }
  s.reports.unshift({
    id: nextId('rp'),
    targetType,
    targetId,
    fromId: me.id,
    reason: String(reason).trim(),
    createdAt: Date.now()
  })
  s.users
    .filter((u) => u.role === 'admin')
    .forEach((a) =>
      notify(a.id, {
        type: 'report',
        title: '收到一条举报',
        body: `${me.nickname || me.name} 举报了${targetType === 'task' ? '一条委托' : '一位用户'}：${reason}`,
        taskId: targetType === 'task' ? targetId : ''
      })
    )
  persist()
  return { ok: true, msg: '举报已提交，管理员会尽快处理' }
}

/* ==================== 申诉 ==================== */

function decorateDispute(d) {
  const s = init()
  const t = s.tasks.find((x) => x.id === d.taskId)
  return {
    ...d,
    task: t ? decorate(t) : null,
    from: getUser(d.fromId),
    statusInfo: DISPUTE_STATUS[d.status] || DISPUTE_STATUS.open,
    timeLabel: timeAgo(d.createdAt)
  }
}

export function createDispute({ taskId, reason }) {
  const s = init()
  const me = currentUser()
  const t = s.tasks.find((x) => x.id === taskId)
  if (!t) return { ok: false, msg: '委托不存在' }
  if (t.publisherId !== me.id && t.assigneeId !== me.id) {
    return { ok: false, msg: '只有订单双方可以申诉' }
  }
  if (!String(reason || '').trim()) return { ok: false, msg: '请填写申诉原因' }
  if (s.disputes.some((d) => d.taskId === taskId && d.status === 'open')) {
    return { ok: false, msg: '该订单已有待处理的申诉' }
  }
  s.disputes.unshift({
    id: nextId('d'),
    taskId,
    fromId: me.id,
    reason: String(reason).trim(),
    status: 'open',
    reply: '',
    createdAt: Date.now()
  })
  s.users
    .filter((u) => u.role === 'admin')
    .forEach((a) =>
      notify(a.id, {
        type: 'dispute',
        title: '有新的纠纷申诉',
        body: `「${t.title}」被发起申诉：${reason}`,
        taskId
      })
    )
  persist()
  return { ok: true, msg: '申诉已提交，管理员会介入处理' }
}

export function disputesOfUser(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  return s.disputes
    .filter((d) => {
      const t = s.tasks.find((x) => x.id === d.taskId)
      return d.fromId === uid || (t && (t.publisherId === uid || t.assigneeId === uid))
    })
    .map((d) => decorateDispute(d))
}

/* ==================== 管理员 ==================== */

export function listAllUsers({ keyword, status } = {}) {
  const s = init()
  let arr = s.users.filter((u) => u.role !== 'admin')
  if (status && status !== 'all') arr = arr.filter((u) => u.status === status)
  if (keyword) {
    const k = String(keyword).trim().toLowerCase()
    arr = arr.filter(
      (u) =>
        u.name.toLowerCase().includes(k) ||
        u.studentId.includes(k) ||
        (u.email || '').toLowerCase().includes(k)
    )
  }
  return arr.map((u) => ({ ...u, stats: myStats(u.id) }))
}

export function toggleBanUser(userId) {
  const s = init()
  const u = s.users.find((x) => x.id === userId)
  if (!u) return { ok: false, msg: '用户不存在' }
  if (u.role === 'admin') return { ok: false, msg: '不能封禁管理员' }
  u.status = u.status === 'banned' ? 'active' : 'banned'
  notify(u.id, {
    type: 'system',
    title: u.status === 'banned' ? '账号已被封禁' : '账号已解封',
    body:
      u.status === 'banned'
        ? '因违反平台规则，你的账号已被限制使用。如有疑问请联系管理员。'
        : '你的账号已恢复正常使用。'
  })
  persist()
  return { ok: true, msg: u.status === 'banned' ? '已封禁' : '已解封' }
}

export function listAuditTasks() {
  const s = init()
  return s.tasks
    .filter((t) => t.audit === 'pending')
    .map(decorate)
    .sort((a, b) => a.createdAt - b.createdAt)
}

// 已上架的委托：管理员可以抽查并下架违规内容
export function listApprovedTasks(limit) {
  const s = init()
  const arr = s.tasks
    .filter((t) => t.audit === 'approved')
    .map(decorate)
    .sort((a, b) => b.createdAt - a.createdAt)
  return limit ? arr.slice(0, limit) : arr
}

export function auditTask(id, pass, reason) {
  const s = init()
  const t = s.tasks.find((x) => x.id === id)
  if (!t) return { ok: false, msg: '委托不存在' }
  t.audit = pass ? 'approved' : 'rejected'
  t.auditReason = pass ? '' : String(reason || '不符合平台规范')
  if (!pass) t.status = 'cancelled'
  notify(t.publisherId, {
    type: 'audit',
    title: pass ? '委托已通过审核' : '委托未通过审核',
    body: pass ? `「${t.title}」已上架，可以在大厅看到` : `「${t.title}」被驳回：${t.auditReason}`,
    taskId: t.id
  })
  persist()
  return { ok: true, msg: pass ? '已通过' : '已驳回' }
}

export function listAllTasks() {
  const s = init()
  return s.tasks.map(decorate).sort((a, b) => b.createdAt - a.createdAt)
}

export function listAllDisputes() {
  const s = init()
  return s.disputes.map(decorateDispute).sort((a, b) => b.createdAt - a.createdAt)
}

export function resolveDispute(id, { action, reply }) {
  const s = init()
  const d = s.disputes.find((x) => x.id === id)
  if (!d) return { ok: false, msg: '申诉不存在' }
  d.status = action === 'reject' ? 'rejected' : 'resolved'
  d.reply = String(reply || '').trim() || (action === 'reject' ? '经核实，申诉不成立。' : '已处理。')
  d.resolvedAt = Date.now()

  // 申诉成立：判服务商违约，扣信誉分并从押金中扣罚，剩余返还
  if (action === 'penalize') {
    const t = s.tasks.find((x) => x.id === d.taskId)
    const target = t && t.assigneeId ? s.users.find((u) => u.id === t.assigneeId) : null
    if (target) {
      target.credit = Math.max(0, target.credit - 5)
      const frozen = Number(t.deposit) || 0
      if (frozen && !t.depositReturned) {
        const penalty = Math.max(10, Math.round(frozen * 0.5))
        const back = Math.max(0, frozen - penalty)
        target.deposit = (Number(target.deposit) || 0) + back
        t.depositReturned = true
        t.depositPenalty = penalty
        d.penalty = penalty
        addLedger(target.id, t.id, 'penalty', penalty, `申诉扣罚 · ${t.title}`)
      }
      if (t && t.status !== 'done') t.status = 'cancelled'
    }
  }
  notify(d.fromId, {
    type: 'dispute',
    title: '你的申诉已处理',
    body: d.reply,
    taskId: d.taskId
  })
  persist()
  return { ok: true, msg: '已处理' }
}

export function adminStats() {
  const s = init()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const t0 = today.getTime()
  const byCat = {}
  s.tasks.forEach((t) => {
    byCat[t.category] = (byCat[t.category] || 0) + 1
  })
  const hot = Object.entries(byCat)
    .map(([k, v]) => ({ cat: categoryOf(k), count: v }))
    .sort((a, b) => b.count - a.count)
  return {
    userCount: s.users.filter((u) => u.role !== 'admin').length,
    bannedCount: s.users.filter((u) => u.status === 'banned').length,
    taskCount: s.tasks.length,
    todayTasks: s.tasks.filter((t) => t.createdAt >= t0).length,
    todayDone: s.tasks.filter((t) => t.doneAt && t.doneAt >= t0).length,
    pendingAudit: s.tasks.filter((t) => t.audit === 'pending').length,
    openDisputes: s.disputes.filter((d) => d.status === 'open').length,
    totalAmount: s.tasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + (t.budget || 0), 0),
    hot,
    maxHot: hot.length ? hot[0].count : 1
  }
}

/* ==================== 公告 / 作品 ==================== */

export function listAnnouncements() {
  return init().announcements.map((a) => ({ ...a, timeLabel: timeAgo(a.createdAt) }))
}

export function publishAnnouncement({ title, body }) {
  const s = init()
  if (!String(title || '').trim()) return { ok: false, msg: '请填写公告标题' }
  s.announcements.unshift({
    id: nextId('an'),
    title: String(title).trim(),
    body: String(body || '').trim(),
    createdAt: Date.now()
  })
  s.users
    .filter((u) => u.role !== 'admin')
    .forEach((u) => notify(u.id, { type: 'system', title: '平台公告', body: String(title).trim() }))
  persist()
  return { ok: true, msg: '公告已发布' }
}

export function portfoliosOf(userId) {
  return init()
    .portfolios.filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function addPortfolio({ title, desc, link }) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  if (!String(title || '').trim()) return { ok: false, msg: '请填写作品标题' }
  s.portfolios.unshift({
    id: nextId('p'),
    userId: me.id,
    title: String(title).trim(),
    desc: String(desc || '').trim(),
    link: String(link || '').trim(),
    createdAt: Date.now()
  })
  persist()
  return { ok: true, msg: '作品已添加' }
}

/* ==================== 钱包 ==================== */

function addLedger(userId, taskId, type, amount, title) {
  const s = init()
  s.ledger.unshift({
    id: nextId('lg'),
    userId,
    taskId,
    type,
    amount: Number(amount) || 0,
    title,
    createdAt: Date.now()
  })
}

export function walletOf(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  const list = s.ledger.filter((l) => l.userId === uid).sort((a, b) => b.createdAt - a.createdAt)
  const income = list.filter((l) => l.type === 'income').reduce((n, l) => n + l.amount, 0)
  const expense = list.filter((l) => l.type === 'expense').reduce((n, l) => n + l.amount, 0)
  return {
    income,
    expense,
    net: income - expense,
    count: list.length,
    records: list.map((l) => {
      const t = s.tasks.find((x) => x.id === l.taskId)
      return {
        ...l,
        taskTitle: t ? t.title : l.title,
        cat: t ? categoryOf(t.category) : null,
        timeLabel: timeAgo(l.createdAt),
        dateLabel: dateLabel(l.createdAt),
        typeLabel: l.type === 'income' ? '接单收入' : l.type === 'expense' ? '发单支出' : '押金扣罚'
      }
    })
  }
}

/* ==================== 好友 ==================== */

function friendRow(aId, bId) {
  const s = init()
  return (
    s.friends.find(
      (f) => (f.aId === aId && f.bId === bId) || (f.aId === bId && f.bId === aId)
    ) || null
  )
}

// none 陌生人 / requested 我申请了 / incoming 对方申请了我 / friend 已是好友
export function friendState(aId, bId) {
  if (!aId || !bId) return { status: 'none' }
  const f = friendRow(aId, bId)
  if (!f) return { status: 'none' }
  if (f.status === 'accepted') return { status: 'friend', row: f }
  return { status: f.requesterId === aId ? 'requested' : 'incoming', row: f }
}

export function areFriends(aId, bId) {
  return friendState(aId, bId).status === 'friend'
}

// 本机已注册的账号 —— 登录页用来自查「这台设备/这个浏览器里到底有哪些账号」
export function localAccounts() {
  // 共享模式下账号存在服务端，没有「本机账号」这回事
  if (isServerUp()) return []
  const s = init()
  return s.users
    .map((u) => ({
      id: u.id,
      nickname: u.nickname || u.name || '同学',
      avatar: u.avatar || '🙂',
      phone: u.phone || '',
      phoneMasked: maskPhone(u.phone),
      username: u.username || '',
      studentId: u.studentId || '',
      isAdmin: u.role === 'admin',
      joinedAt: Number(u.joinedAt) || 0
    }))
    // 管理员放最后，其余按注册时间倒序（最近注册的排最前，方便刚注册就找不到的人）
    .sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? 1 : -1
      return b.joinedAt - a.joinedAt
    })
}

// 手机号脱敏：138****0001
export function maskPhone(phone) {
  const p = String(phone || '')
  if (p.length !== 11) return p
  return p.slice(0, 3) + '****' + p.slice(7)
}

// 按手机号精确搜索同学 —— 必须输入完整 11 位，避免用前缀批量枚举
export async function searchUserByPhone(phone) {
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录', list: [] }
  const p = String(phone || '').trim()
  if (!p) return { ok: false, msg: '请输入手机号', list: [] }
  if (!/^1\d{10}$/.test(p)) return { ok: false, msg: '请输入完整的 11 位手机号', list: [] }

  // 共享模式：手机号不下发到客户端，只能由服务端精确匹配
  if (isServerUp()) {
    const r = await call('/api/find-user', { phone: p })
    if (!r || !r.ok) {
      return { ok: false, msg: (r && r.msg) || '没有找到这个手机号对应的同学', list: [] }
    }
    return {
      ok: true,
      msg: '',
      list: (r.list || []).map((u) => {
        const local = getUser(u.id)
        const t = local ? currentTitleOf(local) : titleOf('chu')
        return Object.assign({}, u, {
          title: t.name,
          titleEmoji: t.emoji,
          isMe: u.id === me.id,
          relation: u.id === me.id ? 'self' : friendState(me.id, u.id).status
        })
      })
    }
  }

  const s = init()
  // 允许搜到自己：自己的手机号也要能搜出卡片（只是主页不显示加好友/聊天按钮）
  const hits = s.users.filter((u) => u.phone === p && u.role !== 'admin' && u.status !== 'banned')
  if (!hits.length) return { ok: false, msg: '没有找到这个手机号对应的同学', list: [] }

  return {
    ok: true,
    msg: '',
    list: hits.map((u) => {
      const t = currentTitleOf(u)
      return {
        id: u.id,
        nickname: u.nickname || u.name || '同学',
        avatar: u.avatar || '🙂',
        college: u.college || '',
        credit: u.credit,
        phoneMasked: maskPhone(u.phone),
        title: t.name,
        titleEmoji: t.emoji,
        isMe: u.id === me.id,
        relation: u.id === me.id ? 'self' : friendState(me.id, u.id).status
      }
    })
  }
}

export function requestFriend(toId) {
  const s = init()
  const me = currentUser()
  if (!me) return { ok: false, msg: '请先登录' }
  if (me.id === toId) return { ok: false, msg: '不能加自己为好友' }

  const st = friendState(me.id, toId)
  if (st.status === 'friend') return { ok: false, msg: '你们已经是好友了' }
  if (st.status === 'requested') return { ok: false, msg: '已发送申请，等对方同意' }
  if (st.status === 'incoming') {
    // 对方先申请过，直接互加
    st.row.status = 'accepted'
    st.row.acceptedAt = Date.now()
    notify(toId, {
      type: 'friend',
      title: '好友申请已通过',
      body: `${me.nickname || me.name} 接受了你的好友申请，现在可以无限聊天了`
    })
    persist()
    return { ok: true, msg: '已互为好友' }
  }

  s.friends.push({
    id: nextId('fr'),
    aId: me.id,
    bId: toId,
    status: 'pending',
    requesterId: me.id,
    createdAt: Date.now()
  })
  notify(toId, {
    type: 'friend',
    title: '收到好友申请',
    body: `${me.nickname || me.name} 想加你为好友`
  })
  persist()
  return { ok: true, msg: '好友申请已发送' }
}

export function respondFriend(id, accept) {
  const s = init()
  const me = currentUser()
  const f = s.friends.find((x) => x.id === id)
  if (!f) return { ok: false, msg: '申请不存在' }
  if (f.aId !== me.id && f.bId !== me.id) return { ok: false, msg: '无权处理该申请' }

  if (accept) {
    f.status = 'accepted'
    f.acceptedAt = Date.now()
  } else {
    s.friends = s.friends.filter((x) => x.id !== id)
  }
  notify(f.requesterId, {
    type: 'friend',
    title: accept ? '好友申请已通过' : '好友申请被拒绝',
    body: accept
      ? `${me.nickname || me.name} 同意了你的好友申请`
      : `${me.nickname || me.name} 拒绝了你的好友申请`
  })
  persist()
  return { ok: true, msg: accept ? '已添加好友' : '已拒绝' }
}

export function incomingRequests(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  return s.friends
    .filter((f) => f.status === 'pending' && f.requesterId !== uid && (f.aId === uid || f.bId === uid))
    .map((f) => ({ ...f, from: getUser(f.requesterId), timeLabel: timeAgo(f.createdAt) }))
    .filter((f) => f.from)
}

export function friendsOf(userId) {
  const s = init()
  const uid = userId || (currentUser() || {}).id
  return s.friends
    .filter((f) => f.status === 'accepted' && (f.aId === uid || f.bId === uid))
    .map((f) => {
      const otherId = f.aId === uid ? f.bId : f.aId
      const u = getUser(otherId)
      return u ? { ...u, friendId: f.id, sinceLabel: timeAgo(f.acceptedAt || f.createdAt) } : null
    })
    .filter(Boolean)
}

/* ==================== 聊天权限（临时聊天 10 句限制） ==================== */

export const TEMP_CHAT_LIMIT = 10

export function messageCountBetween(aId, bId) {
  const s = init()
  return s.messages.filter(
    (m) => (m.fromId === aId && m.toId === bId) || (m.fromId === bId && m.toId === aId)
  ).length
}

// 与某人最近的一条共同订单（用于聊天上下文，没有则返回空串走纯私聊）
export function latestTaskWith(otherId) {
  const me = currentUser()
  if (!me || !otherId) return ''
  const s = init()
  const list = s.tasks.filter(
    (t) =>
      (t.publisherId === me.id && t.assigneeId === otherId) ||
      (t.assigneeId === me.id && t.publisherId === otherId)
  )
  if (!list.length) return ''
  list.sort((a, b) => b.createdAt - a.createdAt)
  return list[0].id
}

export function chatPermission(toId) {
  const me = currentUser()
  if (!me) return { ok: false, friend: false, remaining: 0, reason: '请先登录' }
  if (areFriends(me.id, toId)) {
    return { ok: true, friend: true, remaining: -1, used: 0, limit: TEMP_CHAT_LIMIT }
  }
  const used = messageCountBetween(me.id, toId)
  const remaining = Math.max(0, TEMP_CHAT_LIMIT - used)
  return {
    ok: remaining > 0,
    friend: false,
    used,
    remaining,
    limit: TEMP_CHAT_LIMIT,
    reason: remaining > 0 ? '' : '临时聊天次数已用完，添加好友后可继续'
  }
}

/* ==================== 时间工具 ==================== */

export function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return `${Math.floor(d / 30)} 个月前`
}

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

export function clockLabel(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dateLabel(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function deadlineLabel(ts) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()

  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (ts < Date.now()) return '已截止'
  if (sameDay) return `今天 ${hm}`
  if (isTomorrow) return `明天 ${hm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

export { STEPS, BUILDINGS, buildingOf, RULES, STATUS, tint }
