const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3100/'
async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('林小满', { exact: true }).first().click()
  await page.waitForTimeout(2500)
}
async function tasks(page) {
  return page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('campus_commission_state_v2'))
    const st = raw && raw.data ? raw.data : raw
    return (st.tasks || []).filter(t => String(t.title).startsWith('dbg')).map(t => t.title)
  })
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
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const B = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage(), pb = await B.newPage()
  pa.on('request', r => { if (r.url().includes('/api/state')) console.log('A REQ state', r.method()) })
  pa.on('response', r => { if (r.url().includes('/api/state')) console.log('A RES state', r.status()) })
  await login(pa)
  const t1 = 'dbgA-' + Date.now()
  await publish(pa, t1, 1, '教学楼')
  console.log('A local after publish:', JSON.stringify(await tasks(pa)))

  await login(pb)
  const t2 = 'dbgB-' + Date.now()
  await publish(pb, t2, 3, '两江餐厅')
  console.log('B local after publish:', JSON.stringify(await tasks(pb)))

  // 让 A 回到大厅并等待轮询
  await pa.goto(BASE + '#/pages/hall/hall'); await pa.waitForTimeout(1000)
  for (let i = 0; i < 6; i++) {
    await pa.waitForTimeout(2000)
    console.log('A tick', i, 'local tasks:', JSON.stringify(await tasks(pa)))
  }
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
