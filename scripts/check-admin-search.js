const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3103/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
const setVal = (page, sel, idx, val) => page.evaluate(({ sel, idx, val }) => {
  const el = document.querySelectorAll(sel)[idx]
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, val)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, { sel, idx, val })
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 30000 })
  await p.getByText('张老师', { exact: true }).first().click()
  let inHall = false
  for (let i = 0; i < 15; i++) {
    await p.waitForTimeout(1000)
    if ((await p.evaluate(() => document.body.innerText)).includes('委托大厅')) { inHall = true; break }
  }
  ok(inHall, '演示管理员账号登录成功')
  await p.goto(BASE + '#/pages/chat/chat')
  await p.waitForTimeout(1200)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(500)
  await setVal(p, '.search-input input', 0, '13800000000')
  await p.waitForTimeout(250)
  await p.locator('.search-btn').click({ force: true })
  await p.waitForTimeout(1500)
  const t = await p.evaluate(() => document.body.innerText)
  ok(!t.includes('没有找到'), '管理员手机号不再提示「没有找到这个手机号对应的同学」')
  ok(!t.includes('请先登录'), '管理员搜索不出现「请先登录」')
  ok(t.includes('自己'), '管理员搜到自己并显示「自己」标记')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
