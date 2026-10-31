// 校园委托 · 后端服务
// 纯 Node，零依赖：一个进程同时提供 API 和网页
// 数据存 data.json（备份 = 复制这个文件）
// 安全：所有 /api/*（除 ping）都要带访问口令 x-cc-key；users 里的 password 永不下发

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PORT = Number(process.env.PORT) || 3000
const ROOT = __dirname
const DATA_FILE = path.join(ROOT, 'data.json')
const KEY_FILE = path.join(ROOT, 'access-key.txt')
const PUBLIC_DIR = path.join(ROOT, 'public')

// 需要同步的集合（sessionUserId 是设备本地的，不参与同步）
const COLLECTIONS = [
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

// ---------------- 访问口令 ----------------
let ACCESS_KEY = ''

function randomKey() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const buf = crypto.randomBytes(8)
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[buf[i] % chars.length]
  return s
}

// 填 off / none / open 表示「不设口令，任何人可访问」
const OFF_WORDS = ['off', 'none', 'open', '0', 'false']

function isOff(v) {
  return OFF_WORDS.indexOf(String(v || '').trim().toLowerCase()) >= 0
}

function loadKey() {
  const env = String(process.env.ACCESS_KEY || '').trim()
  if (env) {
    if (isOff(env)) {
      ACCESS_KEY = ''
      return
    }
    ACCESS_KEY = env
    return
  }
  try {
    if (fs.existsSync(KEY_FILE)) {
      const k = fs.readFileSync(KEY_FILE, 'utf8').trim()
      if (k) {
        if (isOff(k)) {
          ACCESS_KEY = ''
          return
        }
        ACCESS_KEY = k
        return
      }
    }
  } catch (e) {
    /* 忽略 */
  }
  ACCESS_KEY = randomKey()
  fs.writeFileSync(KEY_FILE, ACCESS_KEY + '\n')
}

function keyOk(req, parsed) {
  if (!ACCESS_KEY) return true
  const h = String(req.headers['x-cc-key'] || '').trim()
  const q = String(parsed.searchParams.get('key') || '').trim()
  return h === ACCESS_KEY || q === ACCESS_KEY
}

// ---------------- 会话令牌 ----------------
// 登录成功发一个随机 token，之后所有数据接口都认它，认的是「你是谁」
const sessions = new Map()
const SESSION_TTL = 7 * 24 * 3600 * 1000

function issueToken(userId) {
  const t = crypto.randomBytes(16).toString('hex')
  sessions.set(t, { userId, ts: Date.now() })
  return t
}

function whoami(req) {
  const t = String(req.headers['x-cc-token'] || '').trim()
  if (!t) return null
  const s = sessions.get(t)
  if (!s) return null
  if (Date.now() - s.ts > SESSION_TTL) {
    sessions.delete(t)
    return null
  }
  if (!db.data || !Array.isArray(db.data.users)) return null
  const u = db.data.users.find((x) => x.id === s.userId)
  if (!u || u.status === 'banned') return null
  return u
}

// ---------------- 按人过滤 ----------------
// 公开字段：头像昵称这些别人本来就该看到的
const PUBLIC_USER_FIELDS = [
  'id',
  'nickname',
  'name',
  'avatar',
  'college',
  'credit',
  'skills',
  'bio',
  'role',
  'status',
  'accepting',
  'currentTitle'
]

// 只属于本人的集合：字段名 -> 判断归属
const OWNER_FIELD = {
  notifications: 'userId',
  ledger: 'userId',
  favorites: 'userId',
  reports: 'userId',
  portfolios: 'userId'
}

function mineOnly(list, uid) {
  return (list || []).filter((x) => x && x.userId === uid)
}

function relatedToMe(list, uid, fields) {
  return (list || []).filter((x) => x && fields.some((f) => x[f] === uid))
}

function filterFor(me) {
  const d = db.data
  const isAdmin = me && me.role === 'admin'
  const uid = me ? me.id : ''
  const out = {}

  out.seq = d.seq
  out.categories = d.categories || []
  out.announcements = d.announcements || []

  // 用户：所有人只给公开字段；本人给完整（去掉密码）
  out.users = (d.users || []).map((u) => {
    if (isAdmin || u.id === uid) {
      const c = Object.assign({}, u)
      delete c.password
      return c
    }
    const c = {}
    PUBLIC_USER_FIELDS.forEach((f) => {
      if (u[f] !== undefined) c[f] = u[f]
    })
    return c
  })

  // 委托：全部可见（大厅本来就是公开的），但别人的交付凭证不给
  out.tasks = (d.tasks || []).map((t) => {
    if (isAdmin || t.publisherId === uid || t.assigneeId === uid) return t
    const c = Object.assign({}, t)
    delete c.proof
    return c
  })

  // 私密：只有本人（管理员全见）
  if (isAdmin) {
    out.messages = d.messages || []
    out.notifications = d.notifications || []
    out.ledger = d.ledger || []
    out.favorites = d.favorites || []
    out.reports = d.reports || []
    out.disputes = d.disputes || []
  } else {
    out.messages = relatedToMe(d.messages, uid, ['fromId', 'toId'])
    out.notifications = mineOnly(d.notifications, uid)
    out.ledger = mineOnly(d.ledger, uid)
    out.favorites = mineOnly(d.favorites, uid)
    out.reports = mineOnly(d.reports, uid)
    // 申诉：自己提的，或自己那单的
    const myTaskIds = new Set(
      (d.tasks || []).filter((t) => t.publisherId === uid || t.assigneeId === uid).map((t) => t.id)
    )
    out.disputes = (d.disputes || []).filter((x) => x && (x.fromId === uid || myTaskIds.has(x.taskId)))
  }

  // 评价与好友：本来就在主页/大厅公开显示，保留全量（否则他人主页会空）
  out.reviews = d.reviews || []
  out.friends = d.friends || []
  out.portfolios = d.portfolios || []

  return out
}

// ---------------- 存储 ----------------
let db = { version: 1, data: null }

function load() {
  if (!fs.existsSync(DATA_FILE)) return
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    if (raw && typeof raw === 'object' && raw.data) {
      db = { version: Number(raw.version) || 1, data: raw.data }
      console.log('[数据] 已载入 data.json，版本', db.version)
    }
  } catch (e) {
    console.error('[数据] data.json 读取失败，将从空库开始：', e.message)
  }
}

function save() {
  const tmp = DATA_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db))
  fs.renameSync(tmp, DATA_FILE)
}

// 下发给客户端的版本：剥掉密码
function publicData() {
  if (!db.data) return null
  const d = Object.assign({}, db.data)
  if (Array.isArray(d.users)) {
    d.users = d.users.map((u) => {
      const c = Object.assign({}, u)
      delete c.password
      return c
    })
  }
  return d
}

function safeUser(u) {
  if (!u) return null
  const c = Object.assign({}, u)
  delete c.password
  return c
}

// ---------------- 合并逻辑 ----------------
// 判断一条记录是不是「这个人的」——写入和删除都用同一套规则
function ownsRecord(name, rec, uid) {
  if (!rec || !uid) return false
  switch (name) {
    case 'users':
      return rec.id === uid
    case 'tasks':
      // 发布者能改，接单人也要能改（接单、交付、完成都在改这条）
      return rec.publisherId === uid || rec.assigneeId === uid
    case 'messages':
      return rec.fromId === uid || rec.toId === uid
    case 'reviews':
      return rec.fromId === uid || rec.toId === uid
    case 'ledger':
    case 'notifications':
    case 'favorites':
    case 'reports':
    case 'portfolios':
      return rec.userId === uid
    case 'disputes':
      return rec.fromId === uid
    case 'friends':
      return rec.aId === uid || rec.bId === uid || rec.requesterId === uid
    default:
      // announcements / categories 这类公共数据，只有管理员能改
      return false
  }
}

function applyChanges(changes, me) {
  if (!db.data) db.data = {}
  const d = db.data
  let touched = 0

  const isAdmin = me && me.role === 'admin'
  const uid = me ? me.id : ''

  // 保险丝：正常使用不会一次删十几条。客户端状态回退时会算出大批 remove，
  // 这里直接拒掉整批，避免「一个浏览器缓存坏了就把全站删光」。
  let removeCount = 0
  COLLECTIONS.forEach((name) => {
    const patch = changes[name]
    if (patch && Array.isArray(patch.remove)) removeCount += patch.remove.length
  })
  if (!isAdmin && removeCount > 15) {
    console.warn('[拦截] 一次请求要删除', removeCount, '条，已拒绝（用户', uid + '）')
    return -1
  }

  COLLECTIONS.forEach((name) => {
    const patch = changes[name]
    if (!patch) return
    if (!Array.isArray(d[name])) d[name] = []
    const list = d[name]

    if (Array.isArray(patch.upsert)) {
      patch.upsert.forEach((item) => {
        if (!item || !item.id) return
        const i = list.findIndex((x) => x.id === item.id)
        if (i >= 0) {
          // 改已有记录：原记录或新记录任一方归自己才允许
          // （接单时 assigneeId 变成自己，所以「新记录归自己」这条必须放行）
          if (!isAdmin && !ownsRecord(name, list[i], uid) && !ownsRecord(name, item, uid)) return
          let next = item
          // 客户端拿不到密码：保留服务端已存的密码，别被空值覆盖
          if (name === 'users' && !item.password) {
            next = Object.assign({}, item)
            if (list[i].password) next.password = list[i].password
          }
          list[i] = next
        } else {
          // 新增：必须归自己名下
          if (!isAdmin && !ownsRecord(name, item, uid)) return
          if (name === 'users' && !item.password) item.password = ''
          list.push(item)
        }
        touched++
      })
    }

    if (Array.isArray(patch.remove)) {
      patch.remove.forEach((id) => {
        const i = list.findIndex((x) => x.id === id)
        if (i < 0) return
        // 删除同样要验归属：别人的东西一律不许删
        if (!isAdmin && !ownsRecord(name, list[i], uid)) return
        list.splice(i, 1)
        touched++
      })
    }
  })

  // seq 只增不减，减少两端撞 id 的概率
  if (changes.scalars && typeof changes.scalars.seq === 'number') {
    d.seq = Math.max(Number(d.seq) || 0, changes.scalars.seq)
    touched++
  }

  return touched
}

// ---------------- 账号操作 ----------------
function findUser(account) {
  if (!db.data || !Array.isArray(db.data.users)) return null
  const k = String(account || '').trim().toLowerCase()
  if (!k) return null
  return (
    db.data.users.find((x) => {
      const cands = [x.username, x.studentId, x.phone, x.email, x.nickname, x.name]
      return cands.some((v) => v && String(v).trim().toLowerCase() === k)
    }) || null
  )
}

function doLogin(body) {
  const u = findUser(body.account)
  if (!u) return { ok: false, msg: '账号或密码不对' }
  if (String(u.password || '') !== String(body.password || '')) {
    return { ok: false, msg: '账号或密码不对' }
  }
  if (u.status === 'banned') return { ok: false, msg: '账号已被封禁，请联系管理员' }
  return { ok: true, msg: '登录成功', user: safeUser(u) }
}

function doLoginCode(body) {
  if (!/^1\d{10}$/.test(String(body.phone || ''))) return { ok: false, msg: '请输入 11 位手机号' }
  if (String(body.code) !== '123456') return { ok: false, msg: '验证码不正确（演示码 123456）' }
  const phone = String(body.phone).trim()
  const u = (db.data.users || []).find((x) => x.phone === phone)
  if (!u) return { ok: false, msg: '这个手机号还没有注册' }
  if (u.status === 'banned') return { ok: false, msg: '账号已被封禁，请联系管理员' }
  return { ok: true, msg: '登录成功', user: safeUser(u) }
}

function doRegister(body) {
  if (!db.data) db.data = {}
  if (!Array.isArray(db.data.users)) db.data.users = []

  const un = String(body.username || '').trim()
  const ph = String(body.phone || '').trim()
  const sid = String(body.studentId || '').trim()
  const pwd = String(body.password || '')

  if (un.length < 2 || un.length > 12) return { ok: false, msg: '用户名需要 2-12 位' }
  if (!/^1\d{10}$/.test(ph)) return { ok: false, msg: '请输入 11 位手机号' }
  if (pwd.length < 6) return { ok: false, msg: '密码至少 6 位' }
  if (sid && !/^\d{4,20}$/.test(sid)) return { ok: false, msg: '学号应为 4-20 位数字' }

  const users = db.data.users
  if (users.some((u) => String(u.username || '').toLowerCase() === un.toLowerCase())) {
    return { ok: false, code: 'dup_username', msg: '这个用户名已被使用，换一个' }
  }
  if (users.some((u) => String(u.phone || '').trim() === ph)) {
    return { ok: false, code: 'dup_phone', msg: '这个手机号已经注册过了，请直接登录' }
  }
  if (sid && users.some((u) => String(u.studentId || '').trim() === sid)) {
    return { ok: false, code: 'dup_sid', msg: '这个学号已经注册过了，请直接登录' }
  }

  // 生成不会撞的 id
  let n = 1
  const ids = new Set(users.map((u) => u.id))
  while (ids.has('u' + n)) n++

  const user = {
    id: 'u' + n,
    username: un,
    studentId: sid,
    name: un,
    email: '',
    phone: ph,
    password: pwd,
    avatar: '🙂',
    nickname: String(body.nickname || '').trim() || un,
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
  users.push(user)
  db.version += 1
  save()
  return {
    ok: true,
    msg: sid ? '注册成功' : '注册成功，补填学号后才能发单和接单',
    user: safeUser(user)
  }
}

// ---------------- HTTP ----------------
function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-cc-key, x-cc-token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = ''
    req.on('data', (c) => {
      buf += c
      if (buf.length > 30 * 1024 * 1024) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {})
      } catch (e) {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname)
  if (rel === '/' || rel === '') rel = '/index.html'
  const file = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // 单页应用：找不到就回 index.html
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('404 找不到页面。请把 index.html 放进 public/ 目录。')
          return
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] })
        res.end(html)
      })
      return
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    })
    res.end(buf)
  })
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'))
  const pathname = parsed.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-cc-key, x-cc-token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Max-Age': '86400'
    })
    res.end()
    return
  }

  // 探活：客户端用它判断要不要进入「共享模式」；顺便告诉它要不要口令
  if (pathname === '/api/ping') {
    send(res, 200, {
      ok: true,
      version: db.version,
      initialized: !!db.data,
      needKey: !keyOk(req, parsed)
    })
    return
  }

  if (pathname.startsWith('/api/')) {
    if (!keyOk(req, parsed)) {
      send(res, 401, { ok: false, code: 'need_key', msg: '需要访问口令' })
      return
    }
  }

  // 账号：登录 / 验证码登录 / 注册（密码只在服务端比对）
  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await readBody(req)
    const r = doLogin(body || {})
    if (r.ok && r.user) r.token = issueToken(r.user.id)
    send(res, 200, r)
    return
  }

  if (pathname === '/api/login-code' && req.method === 'POST') {
    const body = await readBody(req)
    if (!db.data) {
      send(res, 200, { ok: false, msg: '服务器还没有数据' })
      return
    }
    const r = doLoginCode(body || {})
    if (r.ok && r.user) r.token = issueToken(r.user.id)
    send(res, 200, r)
    return
  }

  if (pathname === '/api/register' && req.method === 'POST') {
    const body = await readBody(req)
    const r = doRegister(body || {})
    if (r.ok && r.user) r.token = issueToken(r.user.id)
    send(res, 200, r)
    return
  }

  // 按手机号找人：手机号不下发，改成服务端精确匹配
  if (pathname === '/api/find-user' && req.method === 'POST') {
    const me = whoami(req)
    if (!me) {
      send(res, 401, { ok: false, code: 'need_login', msg: '请先登录' })
      return
    }
    const body = (await readBody(req)) || {}
    const phone = String(body.phone || '').trim()
    if (!/^1\d{10}$/.test(phone)) {
      send(res, 200, { ok: false, msg: '请输入完整的 11 位手机号', list: [] })
      return
    }
    // 允许搜到自己：自己的手机号也要返回卡片（前端主页据此隐藏加好友/聊天按钮）
    const hit = (db.data.users || []).find(
      (u) => u.phone === phone && u.role !== 'admin' && u.status !== 'banned'
    )
    if (!hit) {
      send(res, 200, { ok: false, msg: '没有找到这个手机号对应的同学', list: [] })
      return
    }
    // 称号：按该用户真实完成数据计算，优先显示其已悬挂的称号
    const allTasks = db.data.tasks || []
    const pubDone = allTasks.filter((t) => t.publisherId === hit.id && t.status === 'done').length
    const takeDone = allTasks.filter((t) => t.assigneeId === hit.id && t.status === 'done').length
    const earned = ['chu']
    if ((Number(hit.credit) || 0) >= 95 && takeDone >= 10) earned.push('zhi')
    if ((Number(hit.credit) || 0) >= 95 && pubDone >= 10) earned.push('yu')
    const titleKey = earned.indexOf(hit.currentTitle) >= 0 ? hit.currentTitle : 'chu'
    const titleMap = { chu: '校园之初', zhi: '校园之星', yu: '校园之誉' }
    const titleEmojiMap = { chu: '🌱', zhi: '⭐', yu: '🏅' }
    const masked = phone.slice(0, 3) + '****' + phone.slice(7)
    send(res, 200, {
      ok: true,
      msg: '',
      list: [
        {
          id: hit.id,
          nickname: hit.nickname || hit.name || '同学',
          avatar: hit.avatar || '🙂',
          college: hit.college || '',
          credit: hit.credit,
          phoneMasked: masked,
          title: titleMap[titleKey],
          titleEmoji: titleEmojiMap[titleKey],
          isMe: hit.id === me.id
        }
      ]
    })
    return
  }

  // 拉取全量：必须登录，只给这个人该看的那部分
  if (pathname === '/api/state' && req.method === 'GET') {
    if (!db.data) {
      send(res, 200, { version: db.version, data: null })
      return
    }
    const me = whoami(req)
    if (!me) {
      send(res, 401, { ok: false, code: 'need_login', msg: '请先登录' })
      return
    }
    const since = Number(parsed.searchParams.get('since') || 0)
    if (since && since === db.version) {
      send(res, 200, { version: db.version, unchanged: true })
      return
    }
    send(res, 200, { version: db.version, data: filterFor(me) })
    return
  }

  // 首次初始化：空库时接受客户端推上来的初始数据
  if (pathname === '/api/state' && req.method === 'POST') {
    const body = await readBody(req)
    if (!body || !body.data) {
      send(res, 400, { ok: false, msg: 'body.data 不能为空' })
      return
    }
    if (db.data) {
      send(res, 200, { ok: true, version: db.version, alreadyInitialized: true })
      return
    }
    db.data = body.data
    db.version = 1
    save()
    console.log('[初始化] 已接收初始数据，用户', (db.data.users || []).length, '个')
    send(res, 200, { ok: true, version: db.version })
    return
  }

  // 增量同步
  if (pathname === '/api/sync' && req.method === 'POST') {
    const body = await readBody(req)
    if (!body || !body.changes) {
      send(res, 400, { ok: false, msg: 'body.changes 不能为空' })
      return
    }
    const me = whoami(req)
    if (!me) {
      send(res, 401, { ok: false, code: 'need_login', msg: '请先登录' })
      return
    }
    if (!db.data) {
      send(res, 409, { ok: false, msg: '服务端还没有初始数据', needInit: true })
      return
    }
    const touched = applyChanges(body.changes, me)
    if (touched < 0) {
      send(res, 400, { ok: false, msg: '一次删除太多，已拒绝。如果确实要清理，请联系管理员' })
      return
    }
    if (touched > 0) {
      db.version += 1
      save()
    }
    send(res, 200, { ok: true, version: db.version, touched })
    return
  }

  if (pathname.startsWith('/api/')) {
    send(res, 404, { ok: false, msg: '接口不存在' })
    return
  }

  serveStatic(req, res, pathname)
})

loadKey()
load()

server.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('  校园委托 后端已启动')
  console.log('  ------------------------------------')
  console.log('  本机访问：  http://localhost:' + PORT)
  if (ACCESS_KEY) {
    console.log('  访问口令：  ' + ACCESS_KEY)
    console.log('  分享链接：  http://<公网IP>:' + PORT + '/?key=' + ACCESS_KEY)
  } else {
    console.log('  访问口令：  已关闭（任何人打开网址即可访问）')
    console.log('  分享链接：  http://<公网IP>:' + PORT + '/')
  }
  console.log('  数据文件：  ' + DATA_FILE)
  console.log('  口令文件：  ' + KEY_FILE)
  console.log('  当前版本：  ' + db.version + (db.data ? '（已有数据）' : '（空库，等待首次初始化）'))
  console.log('')
})
