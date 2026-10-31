// 验证：默认信誉分 100、自定义头像上传、首页与个人主页数据一致、首页卡通插图
const { chromium } = require('playwright-core')
const path = require('path')

const BASE = 'http://127.0.0.1:5180'
const KEY = 'campus_commission_state_v2'
const IMG = path.join(__dirname, '..', 'preview', '01-login.png')
const ok = (c, m) => console.log((c ? 'OK ' : '✗  ') + m)

async function readState(page) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    let s = JSON.parse(raw)
    if (s && s.data) s = s.data
    return s
  }, KEY)
}

async function go(page, hash, wait = 1300) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e && e.message)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push('[console] ' + m.text())
  })

  await page.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await go(page, '/pages/login/login', 1600)

  // ===== 1. 注册新账号，默认信誉分应为 100 =====
  await page.getByText('去注册', { exact: true }).click()
  await page.waitForTimeout(600)
  const inp = page.locator('input')
  await inp.nth(0).fill('赵新宇')
  await inp.nth(1).fill('13911112222')
  await inp.nth(2).fill('123456')
  {
    const cb = page.locator('.m-check').first()
    if (await cb.count()) {
      const cls = String(await cb.getAttribute('class'))
      if (!cls.includes('m-check-on')) await cb.click()
      await page.waitForTimeout(200)
    }
  }
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(1800)

  let s = await readState(page)
  const me = s.users.find((u) => u.id === s.sessionUserId)
  ok(me && me.credit === 100, `1 新账号默认信誉分 ${me && me.credit}（应为 100）`)

  // ===== 2. 个人主页点头像 → 从文件选择 =====
  await go(page, `/pages/profile/profile?id=${me.id}`)
  await page.locator('.h-avatar-edit').click()
  await page.waitForTimeout(800)
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('从相册选择') && t.includes('从文件选择'), '2 点头像弹出「从相册选择 / 从文件选择」')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '30-avatar-sheet.png') })

  await page.getByText('从文件选择', { exact: true }).click()
  await page.waitForTimeout(800)
  const fi = page.locator('input[type=file]')
  if ((await fi.count()) > 0) {
    await fi.last().setInputFiles(IMG)
    await page.waitForTimeout(2600)
  }

  const hasCrop = (await page.locator('.crop-mask').count()) === 1
  ok(hasCrop, '3 选完图弹出裁剪框')
  if (hasCrop) {
    await page.screenshot({ path: path.join(__dirname, '..', 'preview', '31-crop.png') })
    await page.getByText('确定', { exact: true }).first().click()
    await page.waitForTimeout(1800)
    s = await readState(page)
    const me2 = s.users.find((u) => u.id === s.sessionUserId)
    ok(String(me2.avatar).indexOf('data:image') === 0, '4 头像已换成图片（base64 已存）')
    ok(String(me2.avatar).length < 200000, `4b 头像体积 ${Math.round(String(me2.avatar).length / 1024)} KB（上限 200 KB）`)
    await page.screenshot({ path: path.join(__dirname, '..', 'preview', '32-avatar-image.png') })
  }

  // ===== 3. 其他页面也用统一头像组件 =====
  await go(page, '/pages/mine/mine')
  const avCount = await page.locator('.av').count()
  ok(avCount > 0, `5 我的页面头像用统一组件（${avCount} 处）`)

  await go(page, '/pages/hall/hall')
  const cardAv = await page.locator('.tc .av').count()
  ok(cardAv > 0, `6 大厅卡片使用统一头像组件（${cardAv} 处）`)

  // ===== 4. 首页与个人主页数据一致 =====
  await go(page, '/pages/hall/hall')
  const hallNums = await page.locator('.stat-num').allInnerTexts()
  const hallCredit = await page.locator('.credit-chip-num').innerText()

  await go(page, `/pages/profile/profile?id=${me.id}`)
  const profNums = await page.locator('.h-stat-num').allInnerTexts()
  const profCredit = await page.locator('.h-credit-num').innerText()

  ok(
    JSON.stringify(hallNums) === JSON.stringify(profNums),
    `7 首页 ${JSON.stringify(hallNums)} 与个人主页 ${JSON.stringify(profNums)} 一致`
  )
  ok(hallCredit === profCredit, `8 首页信誉分 ${hallCredit} 与个人主页 ${profCredit} 一致`)

  // ===== 5. 首页卡通插图 =====
  await go(page, '/pages/hall/hall')
  const artSrc = await page.locator('.hero-art img').getAttribute('src').catch(() => null)
  ok(artSrc && artSrc.indexOf('data:image/svg') === 0, '9 首页顶部卡通插图已渲染（内联 SVG）')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '32-hall-cartoon.png') })

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
