const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForSelector('.m-demo-item', { timeout: 30000 })
  await p.getByText('张老师', { exact: true }).first().click()
  // 等进入大厅
  let inHall = false
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(1500)
    const t = await p.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) { inHall = true; break }
  }
  ok(inHall, '管理员演示账号登录成功')
  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1500)
  const t2 = await p.evaluate(() => document.body.innerText)
  ok(t2.includes('管理后台'), '「我的」出现「管理后台」入口')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
