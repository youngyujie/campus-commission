const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3100/'
async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('林小满', { exact: true }).first().click()
  await page.waitForTimeout(2500)
}
async function publish(page, title, catIdx, place) {
  await page.goto(BASE + '#/pages/publish/publish'); await page.waitForTimeout(1200)
  await page.locator('.input-title input').fill(title)
  await page.locator('.cat').nth(catIdx).click()
  await page.locator('.textarea textarea').fill('这是一条用于验证双端共享数据的委托描述内容，请忽略')
  await page.locator('.money-input input').first().fill('12')
  await page.locator('.input input').first().fill(place)
  await page.locator('.submit-inline .btn').click()
  await page.waitForTimeout(2000)
}
const dump = async (p, tag) => {
  const s = await p.evaluate(() => window.__ccSync ? window.__ccSync.status() : 'no-debug')
  const lc = await p.evaluate(() => window.__ccSync ? window.__ccSync.localCounts() : null)
  const sc = await p.evaluate(() => window.__ccSync ? window.__ccSync.sentCounts() : null)
  console.log(tag, JSON.stringify({ s, lc, sc }))
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const B = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage(), pb = await B.newPage()
  await login(pa)
  await dump(pa, 'A after login')
  await publish(pa, 'dbgA-' + Date.now(), 1, '教学楼')
  await dump(pa, 'A after publish')
  await login(pb)
  await publish(pb, 'dbgB-' + Date.now(), 3, '两江餐厅')
  await dump(pa, 'A after B publish')
  await pa.waitForTimeout(6000)
  await dump(pa, 'A after 6s')
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
