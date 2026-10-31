const { chromium } = require('playwright-core')
const path = require('path')
const fs = require('fs')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const OUT = path.resolve(__dirname, '../preview/upgrade')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()

  await p.goto(FILE, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.getByText('林小满', { exact: true }).first().click()
  await p.waitForTimeout(1500)

  const shot = async (name) => {
    await p.waitForTimeout(500)
    await p.screenshot({ path: path.join(OUT, name + '.png') })
    console.log('shot', name)
  }

  await shot('01-hall')

  await p.locator('.ai-search').click()
  await p.waitForTimeout(700)
  await shot('02-search')
  await p.locator('.sbar-input input').fill('奶茶')
  await p.locator('.sbar-btn').click()
  await p.waitForTimeout(600)
  await shot('03-search-results')

  await p.goto(FILE + '#/pages/publish/publish')
  await p.waitForTimeout(1000)
  await shot('04-publish')

  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(900)
  await shot('05-mine')

  await p.locator('.p-title').click()
  await p.waitForTimeout(800)
  await shot('06-title')

  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(800)
  await p.locator('.avatar-hit').click()
  await p.waitForTimeout(700)
  await shot('07-avatar-sheet')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)

  await p.goto(FILE + '#/pages/avatars/avatars')
  await p.waitForTimeout(900)
  await shot('08-avatars')

  // 好友搜索卡片 → 对方主页
  await p.goto(FILE + '#/pages/chat/chat')
  await p.waitForTimeout(900)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(400)
  await p.locator('.search-input input').fill('13800000002')
  await p.locator('.search-btn').click()
  await p.waitForTimeout(700)
  await shot('09-friend-card')
  await p.locator('.ucard').first().click()
  await p.waitForTimeout(900)
  await shot('10-profile-bottom')

  await b.close()
  console.log('DONE ->', OUT)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
