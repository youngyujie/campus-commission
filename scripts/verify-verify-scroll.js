const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)

async function loginAs(page, name) {
  await page.goto(FILE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1300)
  await page.getByText(name, { exact: true }).first().click()
  await page.waitForTimeout(1500)
}

async function drag(page, x, y, dy) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / 5, id: 1 }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
  await cdp.detach()
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))

  // 1) 演示账号林小满：应仍是「已认证」（被补全）
  await loginAs(p, '林小满')
  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1000)
  const b1 = await p.evaluate(() => document.body.innerText)
  ok(b1.includes('已认证') && !b1.includes('还未完成学生认证'), '林小满（演示）仍是已认证')

  // 2) 许一帆（只有手机号、无完整认证）：应为未认证
  await p.getByText('退出登录', { exact: true }).click()
  await p.waitForTimeout(500)
  await p.getByText('退出', { exact: true }).last().click()
  await p.waitForTimeout(1300)
  await loginAs(p, '许一帆')
  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1000)
  const b2 = await p.evaluate(() => document.body.innerText)
  ok(b2.includes('还未完成学生认证') || b2.includes('未认证'), '许一帆（无完整认证）为未认证')

  // 3) 滑动误触：回到大厅，拖动卡片不应打开详情
  await p.getByText('大厅', { exact: true }).last().click()
  await p.waitForTimeout(1200)
  const card = p.locator('.mcard').first()
  await card.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)
  let box = await card.boundingBox()
  if (box) {
    await drag(p, box.x + box.width / 2, box.y + box.height / 2, -90)
  }
  ok(!p.url().includes('detail'), '拖动卡片（滑动）未误打开详情')

  // 4) 真正点一下卡片：应打开详情
  const card2 = p.locator('.mcard').first()
  await card2.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)
  box = await card2.boundingBox()
  if (box) {
    await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  }
  await p.waitForTimeout(900)
  ok(p.url().includes('detail'), '点击卡片正常打开详情')

  ok(errs.length === 0, '无页面 JS 报错' + (errs.length ? '：' + errs.join('|') : ''))
  await b.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
