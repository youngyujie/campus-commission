const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForSelector('.m-mode', { timeout: 30000 })
  await p.waitForTimeout(600)
  await p.screenshot({ path: require('path').resolve(__dirname, '../preview/upgrade/12-login-pwd.png') })
  // 切到验证码模式
  await p.locator('.m-mode-link').click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: require('path').resolve(__dirname, '../preview/upgrade/13-login-code.png') })
  console.log('saved login screenshots')
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
