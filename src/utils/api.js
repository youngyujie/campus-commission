// 与后端通信的薄封装
// 单独一层是为了避免 store.js ↔ sync.js 循环引用
let base = ''
let key = ''
let token = ''
let remote = false
let serverUp = false

export function setBase(b) {
  base = String(b || '').replace(/\/+$/, '')
}
export function getBase() {
  return base
}
export function setKey(k) {
  key = String(k || '')
}
export function getKey() {
  return key
}
export function setRemote(v) {
  remote = !!v
}
export function isRemote() {
  return remote
}
const TOKEN_KEY = 'cc_token_v1'

export function setToken(t) {
  token = String(t || '')
  try {
    if (token) uni.setStorageSync(TOKEN_KEY, token)
    else uni.removeStorageSync(TOKEN_KEY)
  } catch (e) {
    /* 忽略 */
  }
}
export function getToken() {
  return token
}
export function loadToken() {
  try {
    token = String(uni.getStorageSync(TOKEN_KEY) || '')
  } catch (e) {
    token = ''
  }
  return token
}
// 后端在不在（不要求登录）
export function setServerUp(v) {
  serverUp = !!v
}
export function isServerUp() {
  return serverUp
}

// 托管平台的分享链接要求每个请求都带 sharecode；浏览器没保住 cookie 时，
// /api/* 会 403（返回 HTML），前端就会误报「连不上服务器」。
// 这里把当前页面 URL 里的 sharecode / key 透传到每个接口请求上。
function decorateUrl(u) {
  try {
    const q = new URLSearchParams(location.search || '')
    const parts = []
    const sc = q.get('sharecode')
    const k = q.get('key')
    if (sc) parts.push('sharecode=' + encodeURIComponent(sc))
    if (k) parts.push('key=' + encodeURIComponent(k))
    if (!parts.length) return u
    return u + (u.indexOf('?') >= 0 ? '&' : '?') + parts.join('&')
  } catch (e) {
    return u
  }
}

async function raw(path, opts, timeout) {
  const ms = timeout || 8000
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null
  try {
    const headers = Object.assign({}, (opts && opts.headers) || {})
    if (key) headers['x-cc-key'] = key
    if (token) headers['x-cc-token'] = token
    const r = await fetch(decorateUrl(base + path), Object.assign({}, opts, { headers, signal: ctrl ? ctrl.signal : undefined }))
    if (r.status === 401) {
      const j = await r.json().catch(() => null)
      if (j && j.code === 'need_login') return { __needLogin: true }
      return { __needKey: true }
    }
    if (r.status === 409) {
      const j = await r.json().catch(() => null)
      return { __conflict: true, body: j }
    }
    if (!r.ok) return null
    return await r.json()
  } catch (e) {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function get(path, timeout) {
  return raw(path, { method: 'GET' }, timeout)
}

export async function call(path, body, timeout, retry) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }
  let r = await raw(path, opts, timeout)
  // 冷启动 / 网络抖动：失败后延长超时重试一次（搜索类请求可传 retry=false 快速失败）
  if (!r && retry !== false) r = await raw(path, opts, Math.max(Number(timeout) || 8000, 15000))
  if (!r) return { ok: false, msg: '连不上服务器，请检查网络（也可能是后端刚启动，稍等几秒重试）' }
  if (r.__needKey) return { ok: false, code: 'need_key', msg: '访问口令不正确，请用完整链接打开' }
  if (r.__needLogin) return { ok: false, code: 'need_login', msg: '请先登录' }
  if (r.code === 'need_login') return { ok: false, code: 'need_login', msg: '请先登录' }
  return r
}

export function ping(timeout) {
  return raw('/api/ping', { method: 'GET' }, timeout || 4000)
}
