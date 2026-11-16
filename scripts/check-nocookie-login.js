const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-mode', { timeout: 30000 })
  // 模拟浏览器没保住 sharecode cookie
  await ctx.clearCookies()
  await p.locator('.m-mode-link').click()
  await p.waitForTimeout(400)
  await p.evaluate(() => {
    const el = document.querySelectorAll('input.uni-input-input')[0]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '17381081281')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await p.waitForTimeout(300)
  await p.locator('.m-mode-fill').click()
  await p.waitForTimeout(300)
  await p.locator('.m-check').click()
  await p.waitForTimeout(300)
  await p.locator('.m-submit').click({ force: true })
  let inHall = false
  for (let i = 0; i < 14; i++) {
    await p.waitForTimeout(1500)
    const t = await p.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) { inHall = true; break }
    if (/连不上服务器/.test(t)) { console.log('   still error:', t.slice(-120)); break }
  }
  ok(inHall, '清掉 cookie 后仍能验证码登录（sharecode 透传生效）')
  if (inHall) {
    await p.getByText('我的', { exact: true }).last().click()
    await p.waitForTimeout(1500)
    ok((await p.evaluate(() => document.body.innerText)).includes('管理后台'), '管理员入口正常')
  }
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
