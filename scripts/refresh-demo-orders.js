// 一键刷新线上演示订单：把所有 pending 订单的截止时间延到远期，并补足各分类订单。
// 用途：种子订单的 deadline 是相对时间，部署久了会全部过期，导致大厅空无一物。
//   本脚本用管理员身份登录线上，把待接单订单"续命"，让评委随时能看到大厅内容。
//
// 用法：node scripts/refresh-demo-orders.js [baseUrl] [sharecode]
//   默认 baseUrl = https://campus-commission-35470.apps.workbuddy.host
//   默认 sharecode = L6JLE2TLA6
// 说明：管理员账号 admin/admin888 为项目内置演示管理员；token 由登录接口临时获取，不落盘。

const BASE = (process.argv[2] || 'https://campus-commission-35470.apps.workbuddy.host').replace(/\/+$/, '')
const SHARECODE = process.argv[3] || 'L6JLE2TLA6'
const Q = 'sharecode=' + encodeURIComponent(SHARECODE)

// 远期截止时间：2030-12-31 00:00 UTC，约等于"无上限"
const DEADLINE = 1924300800000
const ADMIN = { account: 'admin', password: 'admin888' }

// 补足用的演示订单（由演示账号发布，覆盖各分类）
const DEMO_ORDERS = [
  ['demo01', '高数辅导：多元函数微分专题', '多元函数偏导、全微分、隐函数求导这块总卡壳，希望有人带着过一遍典型题，能讲清楚思路就行。', 'study', 60, '图书馆 4 楼讨论间', 'lib', 'u3', true],
  ['demo02', '英语四级口语搭档陪练', '找人每周两次练四级口语，互相提问、纠正发音，线上语音就行，时间可约。', 'study', 40, '线上即可', 'lib', 'u1', false],
  ['demo03', '社团活动拍照跟拍一下午', '社团招新摆摊，需要有人拍现场照片，大概下午两点到六点，设备我这边有。', 'photo', 120, '中心广场', 'song', 'u4', false],
  ['demo04', '证件照修图 + 换底色', '一张一寸证件照，帮忙精修一下，换成蓝底，导出高清电子版即可。', 'photo', 20, '线上即可', 'zhu', 'u5', false],
  ['demo05', '帮忙取一份快递到梅园', '菜鸟驿站到了一个包裹，帮忙取一下送到梅园 5 号楼下就行，东西不重。', 'errand', 10, '菜鸟驿站', 'mei', 'u2', true],
  ['demo06', '帮整理一份实验数据表格', '有几组实验数据，需要按模板整理成 Excel、做个简单图表，数据量不大。', 'doc', 50, '线上即可', 'teach', 'u5', false]
]

async function req(path, opts = {}) {
  const r = await fetch(BASE + path + (path.includes('?') ? '&' : '?') + Q, {
    method: opts.method || 'GET',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      opts.token ? { 'x-cc-token': opts.token } : {}
    ),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(60000)
  })
  return r.json()
}

;(async () => {
  console.log('目标:', BASE)
  const login = await req('/api/login', { method: 'POST', body: ADMIN })
  if (!login.ok || !login.token) throw new Error('管理员登录失败: ' + JSON.stringify(login))
  const token = login.token
  console.log('管理员登录成功')

  const stateRes = await req('/api/state', { token })
  if (!stateRes.data || !Array.isArray(stateRes.data.tasks)) throw new Error('拉取状态失败')
  const tasks = stateRes.data.tasks
  console.log('当前任务数:', tasks.length, '版本:', stateRes.version)

  const now = Date.now()
  const upsert = []
  // 1) 现有 pending 全部延期
  tasks.forEach((t) => {
    if (t.status === 'pending' && t.deadline < DEADLINE) {
      upsert.push(Object.assign({}, t, { deadline: DEADLINE }))
    }
  })
  // 2) 补演示订单
  const ids = new Set(tasks.map((t) => t.id))
  DEMO_ORDERS.forEach((o, i) => {
    if (ids.has(o[0])) return
    upsert.push({
      id: o[0], title: o[1], desc: o[2], category: o[3], budget: o[4],
      itemPrice: 0, proof: [], deadline: DEADLINE, place: o[5], building: o[6],
      attachments: [], anonymous: false, urgent: o[8], publisherId: o[7],
      assigneeId: '', status: 'pending', deposit: 0, audit: 'approved',
      auditReason: '', createdAt: now - i * 60000
    })
  })

  if (!upsert.length) {
    console.log('无需刷新：订单都已延期且演示订单齐全')
    return
  }
  const res = await req('/api/sync', { method: 'POST', token, body: { changes: { tasks: { upsert, remove: [] } } } })
  if (!res.ok) throw new Error('写入失败: ' + JSON.stringify(res))
  console.log('刷新成功：touched =', res.touched, ', 新版本 =', res.version)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
