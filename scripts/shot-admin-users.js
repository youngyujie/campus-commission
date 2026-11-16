// 截取线上「用户管理」页效果（仅用演示管理员账号）
const { chromium } = require('playwright-core')
const path = require('path')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 40000 })
  await p.getByText('张老师', { exact: true }).first().click()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    if ((await p.evaluate(() => document.body.innerText)).includes('委托大厅')) break
  }
  await p.goto(BASE + '#/pages/admin/admin')
  await sleep(1800)
  await p.getByText('用户管理', { exact: false }).first().click()
  await sleep(1800)
  await p.screenshot({ path: path.resolve(__dirname, '../preview/upgrade/17-admin-users.png') })
  console.log('saved 17-admin-users.png, cards=', await p.locator('.user-card').count())
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
