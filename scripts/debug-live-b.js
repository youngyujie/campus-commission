const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('林小满', { exact: true }).first().click()
  await page.waitForTimeout(2500)
}
async function userFields(page) {
  return page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('campus_commission_state_v2'))
    const st = raw && raw.data ? raw.data : raw
    const me = st.users.find(u => u.id === st.sessionUserId)
    return me ? { id: me.id, verifiedAt: !!me.verifiedAt, studentId: me.studentId, school: me.school, realName: me.realName, idCard: !!me.idCard, credit: me.credit } : null
  })
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const A = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const B = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pa = await A.newPage(), pb = await B.newPage()
  pb.on('console', m => { if (m.type() === 'error') console.log('B CONSOLE', m.text()) })
  await login(pa)
  const t1 = 'debugA-' + Date.now()
  await pa.goto(BASE + '#/pages/publish/publish'); await pa.waitForTimeout(1200)
  await pa.locator('.input-title input').fill(t1)
  await pa.locator('.cat').nth(1).click()
  await pa.locator('.textarea textarea').fill('这是一条用于验证双端共享数据的委托描述内容，请忽略')
  await pa.locator('.money-input input').first().fill('12')
  await pa.locator('.input input').first().fill('教学楼')
  await pa.locator('.submit-inline .btn').click()
  await pa.waitForTimeout(2000)

  await login(pb)
  console.log('B user fields:', JSON.stringify(await userFields(pb)))
  await pb.goto(BASE + '#/pages/hall/hall'); await pb.waitForTimeout(1500)
  console.log('B hall has t1:', (await pb.evaluate(() => document.body.innerText)).includes(t1))

  const t2 = 'debugB-' + Date.now()
  await pb.goto(BASE + '#/pages/publish/publish'); await pb.waitForTimeout(1200)
  await pb.locator('.input-title input').fill(t2)
  await pb.locator('.cat').nth(3).click()
  await pb.locator('.textarea textarea').fill('这是一条用于验证双端共享数据的委托描述内容，请忽略')
  await pb.locator('.money-input input').first().fill('12')
  await pb.locator('.input input').first().fill('两江餐厅')
  await pb.waitForTimeout(400)
  console.log('B submit class:', await pb.locator('.submit-inline .btn').getAttribute('class'))
  await pb.locator('.submit-inline .btn').click()
  await pb.waitForTimeout(500)
  console.log('B after 0.5s:', (await pb.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(-260))
  await pb.waitForTimeout(1800)
  console.log('B after 2.3s:', (await pb.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(-260))
  await pb.goto(BASE + '#/pages/hall/hall'); await pb.waitForTimeout(1500)
  console.log('B hall has t2:', (await pb.evaluate(() => document.body.innerText)).includes(t2))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
