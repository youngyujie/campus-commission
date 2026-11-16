const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3103/'
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 30000 })
  await p.getByText('林小满', { exact: true }).first().click()
  await p.waitForTimeout(3000)
  // 我的
  await p.goto(BASE + '#/pages/mine/mine')
  await p.waitForTimeout(1200)
  await p.screenshot({ path: require('path').resolve(__dirname, '../preview/upgrade/15-mine-viewed.png') })
  // 好友搜自己
  await p.goto(BASE + '#/pages/chat/chat')
  await p.waitForTimeout(1200)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(500)
  await p.evaluate(() => {
    const el = document.querySelector('.search-input input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '13800000001')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await p.locator('.search-btn').click({ force: true })
  await p.waitForSelector('.ucard', { timeout: 15000 })
  await p.waitForTimeout(500)
  await p.screenshot({ path: require('path').resolve(__dirname, '../preview/upgrade/16-self-card.png') })
  console.log('saved')
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
