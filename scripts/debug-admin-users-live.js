// 诊断线上 /api/admin/users 返回（只记录状态码，不读取任何凭证）
const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const logs = []
  p.on('response', r => {
    if (r.url().includes('/api/admin/users')) logs.push('admin/users status=' + r.status())
    if (r.url().includes('/api/state')) logs.push('state status=' + r.status())
  })
  p.on('pageerror', e => logs.push('pageerror=' + String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 40000 })
  await p.getByText('张老师', { exact: true }).first().click()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    if ((await p.evaluate(() => document.body.innerText)).includes('委托大厅')) break
  }
  await p.goto(BASE + '#/pages/admin/admin')
  await sleep(2500)
  await p.getByText('用户管理', { exact: false }).first().click()
  await sleep(14000)
  const info = await p.evaluate(() => ({
    body: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 600),
    filters: document.querySelectorAll('.u-filter').length,
    cards: document.querySelectorAll('.user-card').length
  }))
  console.log(JSON.stringify(info, null, 2))
  console.log('network:', logs.join(' ; '))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
