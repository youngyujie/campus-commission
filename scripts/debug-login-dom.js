const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForTimeout(5000)
  console.log('body:', (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 400))
  console.log('counts:', await p.evaluate(() => ({
    mInput: document.querySelectorAll('.m-input').length,
    inputs: document.querySelectorAll('input').length,
    mSubmit: document.querySelectorAll('.m-submit').length,
    uniInput: document.querySelectorAll('uni-input').length,
    mCard: document.querySelectorAll('.m-card').length
  })))
  console.log('input classes:', await p.evaluate(() => [...document.querySelectorAll('input')].map(i => i.className).slice(0, 10)))
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
