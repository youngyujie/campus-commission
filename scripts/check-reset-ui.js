const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3102/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
async function setReset(page, idx, val) {
  await page.evaluate(({ idx, val }) => {
    const els = document.querySelectorAll('.reset-sheet input.uni-input-input')
    const el = els[idx]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, { idx, val })
}
async function setLogin(page, idx, val) {
  await page.evaluate(({ idx, val }) => {
    const el = document.querySelectorAll('.m-card input.uni-input-input')[idx]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, { idx, val })
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-switch-link', { timeout: 30000 })
  await p.getByText('修改密码', { exact: true }).click()
  await p.waitForSelector('.reset-sheet', { timeout: 10000 })
  ok(true, '登录页「修改密码」弹层打开')
  await setReset(p, 0, '13933334444')
  await setReset(p, 1, '123456')
  await setReset(p, 2, '444444')
  await setReset(p, 3, '444444')
  await p.waitForTimeout(300)
  await p.locator('.reset-btn-primary').click({ force: true })
  await p.waitForTimeout(1500)
  const closed = (await p.locator('.reset-sheet').count()) === 0
  ok(closed, '修改成功后弹层关闭')
  // 用新密码登录
  await p.waitForSelector('.m-card input.uni-input-input', { timeout: 10000 })
  await setLogin(p, 0, '13933334444')
  await setLogin(p, 1, '444444')
  await p.waitForTimeout(300)
  await p.locator('.m-check').click()
  await p.locator('.m-submit').click({ force: true })
  let inHall = false
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(1000)
    const t = await p.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) { inHall = true; break }
  }
  ok(inHall, '用新密码登录成功')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
