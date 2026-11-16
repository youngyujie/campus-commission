const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3104/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
const setVal = (page, sel, idx, val) => page.evaluate(({ sel, idx, val }) => {
  const el = document.querySelectorAll(sel)[idx]
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, val)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, { sel, idx, val })
async function hall(page) {
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)
    if ((await page.evaluate(() => document.body.innerText)).includes('委托大厅')) return true
  }
  return false
}
async function search(page, phone) {
  await page.goto(BASE + '#/pages/chat/chat')
  await page.waitForTimeout(1200)
  await page.getByText('好友', { exact: false }).first().click()
  await page.waitForTimeout(500)
  await setVal(page, '.search-input input', 0, phone)
  await page.waitForTimeout(250)
  await page.locator('.search-btn').click({ force: true })
  await page.waitForTimeout(1200)
  return page.evaluate(() => document.body.innerText)
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage()
  const errs = []
  pa.on('pageerror', e => errs.push(String(e)))
  await pa.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pa.waitForSelector('.m-demo-item', { timeout: 30000 })
  await pa.getByText('林小满', { exact: true }).first().click()
  ok(await hall(pa), '演示账号登录成功')
  let t = await search(pa, '13800000001')
  ok(t.includes('自己'), '普通账号搜到自己 → 显示「自己」')
  ok(!t.includes('没有找到'), '普通账号搜自己不再提示未注册')
  t = await search(pa, '13800000006')
  ok((await pa.locator('.ucard').count()) >= 1, '其他已注册账号能搜到')
  ok(!t.includes('请先登录'), '不出现「请先登录」')

  // 注册一个所有者手机号（自动管理员），验证管理员也能搜到自己
  const C = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pc = await C.newPage()
  pc.on('pageerror', e => errs.push(String(e)))
  await pc.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pc.waitForSelector('.m-switch-link', { timeout: 30000 })
  await pc.getByText('去注册', { exact: true }).click()
  await pc.waitForTimeout(500)
  await setVal(pc, '.m-card input.uni-input-input', 0, '管理员甲')
  await setVal(pc, '.m-card input.uni-input-input', 1, '17381081281')
  await setVal(pc, '.m-card input.uni-input-input', 2, '123456')
  await pc.waitForTimeout(300)
  await pc.locator('.m-check').click()
  await pc.locator('.m-submit').click({ force: true })
  ok(await hall(pc), '所有者手机号注册并登录成功')
  const t2 = await search(pc, '17381081281')
  ok(t2.includes('自己'), '管理员账号也能搜到自己')
  ok(!t2.includes('没有找到'), '管理员搜自己不再提示未注册')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
