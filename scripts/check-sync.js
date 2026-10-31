const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3100/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('林小满', { exact: true }).first().click()
  await page.waitForTimeout(2500)
}
async function publish(page, title, catIdx, place) {
  await page.goto(BASE + '#/pages/publish/publish')
  await page.waitForTimeout(1200)
  await page.locator('.input-title input').fill(title)
  await page.locator('.cat').nth(catIdx).click()
  await page.locator('.textarea textarea').fill('这是一条用于验证双端共享数据的委托描述内容，请忽略')
  await page.locator('.money-input input').first().fill('12')
  await page.locator('.input input').first().fill(place)
  await page.waitForTimeout(300)
  await page.locator('.submit-inline .btn').click()
  await page.waitForTimeout(1500)
}
async function waitFor(page, text, tries = 7) {
  for (let i = 0; i < tries; i++) {
    const t = await page.evaluate(() => document.body.innerText)
    if (t.includes(text)) return true
    await page.waitForTimeout(2000)
  }
  return false
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const B = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage()
  const pb = await B.newPage()
  const errs = []
  pa.on('pageerror', e => errs.push('A:' + e))
  pb.on('pageerror', e => errs.push('B:' + e))

  await login(pa)
  ok((await pa.evaluate(() => document.body.innerText)).includes('委托大厅'), 'A 端（设备 1）登录成功')

  const t1 = '同步A-' + Date.now()
  await publish(pa, t1, 1, '教学楼')
  await pa.goto(BASE + '#/pages/hall/hall')
  await pa.waitForTimeout(1000)
  ok(await waitFor(pa, t1, 2), 'A 端发布成功（大厅可见）')

  await login(pb)
  await pb.goto(BASE + '#/pages/hall/hall')
  await pb.waitForTimeout(1200)
  ok(await waitFor(pb, t1), 'B 端（设备 2）看到 A 端新发布的委托')

  const t2 = '同步B-' + Date.now()
  await publish(pb, t2, 3, '两江餐厅')
  await pb.goto(BASE + '#/pages/hall/hall')
  await pb.waitForTimeout(1000)
  ok(await waitFor(pb, t2, 2), 'B 端发布成功（大厅可见）')

  await pa.goto(BASE + '#/pages/hall/hall')
  await pa.waitForTimeout(1200)
  ok(await waitFor(pa, t2), 'A 端看到 B 端新发布的委托（双向共享）')

  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
