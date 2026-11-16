const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3102/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
const phone = '13933334444'
const pwd = '333333'
async function setInput(page, idx, val) {
  await page.evaluate(({ idx, val }) => {
    const el = document.querySelectorAll('input.uni-input-input')[idx]
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, { idx, val })
}
async function waitHall(page, tries = 14) {
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(1000)
    const t = await page.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) return true
  }
  return false
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const B = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage(), pb = await B.newPage()
  const errs = []
  pa.on('pageerror', e => errs.push('A:' + e))
  pb.on('pageerror', e => errs.push('B:' + e))

  // A：注册
  let t0 = Date.now()
  await pa.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pa.waitForSelector('.m-switch-link', { timeout: 30000 })
  console.log('A load ms:', Date.now() - t0)
  await pa.getByText('去注册', { exact: true }).click()
  await pa.waitForTimeout(400)
  await setInput(pa, 0, '跨端测试')
  await setInput(pa, 1, phone)
  await setInput(pa, 2, pwd)
  await pa.waitForTimeout(300)
  await pa.locator('.m-check').click()
  t0 = Date.now()
  await pa.locator('.m-submit').click({ force: true })
  const aIn = await waitHall(pa)
  console.log('A register+login ms:', Date.now() - t0)
  ok(aIn, 'A 浏览器注册成功并进入大厅')

  // B：全新上下文，用同一账号登录
  t0 = Date.now()
  await pb.goto(BASE, { waitUntil: 'domcontentloaded' })
  await pb.waitForSelector('.m-switch-link', { timeout: 30000 })
  console.log('B load ms:', Date.now() - t0)
  await setInput(pb, 0, phone)
  await setInput(pb, 1, pwd)
  await pb.waitForTimeout(300)
  await pb.locator('.m-check').click()
  t0 = Date.now()
  await pb.locator('.m-submit').click({ force: true })
  const bIn = await waitHall(pb)
  console.log('B login ms:', Date.now() - t0)
  ok(bIn, 'B 浏览器用 A 注册的账号登录成功（跨浏览器共享）')
  if (!bIn) {
    const t = await pb.evaluate(() => document.body.innerText)
    console.log('B page tail:', t.replace(/\n+/g, ' | ').slice(-200))
  }
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
