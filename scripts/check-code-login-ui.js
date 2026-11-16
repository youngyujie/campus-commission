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
  // 切验证码模式
  await p.locator('.m-mode-link').click()
  await p.waitForTimeout(400)
  // 用原生 setter 填手机号，触发 input 让 v-model 生效
  await p.evaluate(() => {
    const el = document.querySelectorAll('input.uni-input-input')[0]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '17381081281')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await p.waitForTimeout(300)
  // 填入验证码
  await p.locator('.m-mode-fill').click()
  await p.waitForTimeout(300)
  // 同意协议
  await p.locator('.m-check').click()
  await p.waitForTimeout(300)
  await p.locator('.m-submit').click({ force: true })
  // 等进入大厅
  let inHall = false
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(1500)
    const t = await p.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) { inHall = true; break }
  }
  ok(inHall, '验证码登录成功（17381081281 + 123456）')
  if (inHall) {
    await p.getByText('我的', { exact: true }).last().click()
    await p.waitForTimeout(1500)
    const t2 = await p.evaluate(() => document.body.innerText)
    ok(t2.includes('管理后台'), '登录后显示「管理后台」（管理员身份已恢复）')
  }
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
