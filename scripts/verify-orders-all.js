const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const OUT = path.resolve(__dirname, '../preview')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)

async function login(page) {
  await page.goto(FILE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1300)
  await page.getByText('林小满', { exact: true }).first().click()
  await page.waitForTimeout(1600)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const p = await m.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))

  await login(p)
  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1100)
  const mineTabs = await p.evaluate(() => document.querySelectorAll('.tabs').length)
  ok(mineTabs === 0, '「我的」页已无分段标签')
  const bodyMine = await p.evaluate(() => document.body.innerText)
  ok(!bodyMine.includes('收到的评价') && !bodyMine.includes('添加作品案例'), '「我的」页不再含 评价/作品/申诉 内容')

  await p.getByText('我的订单', { exact: true }).click()
  await p.waitForTimeout(1200)
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.tab')].map((e) => e.textContent.replace(/\d+/g, '').trim()))
  ok(['我发布的', '我接的', '收藏', '收到的评价', '作品', '申诉'].every((t) => tabs.includes(t)), '订单页 6 个分段: ' + JSON.stringify(tabs))
  await p.screenshot({ path: OUT + '/chg2-orders.png' })

  await p.locator('.tab', { hasText: '作品' }).click()
  await p.waitForTimeout(600)
  ok(await p.evaluate(() => document.body.innerText.includes('添加作品案例')), '作品段含「添加作品案例」')

  await p.locator('.tab', { hasText: '申诉' }).click()
  await p.waitForTimeout(600)
  ok(await p.evaluate(() => document.body.innerText.includes('申诉原因') || document.body.innerText.includes('没有申诉记录')), '申诉段可切换')

  await p.locator('.tab', { hasText: '收到的评价' }).click()
  await p.waitForTimeout(600)
  ok(await p.evaluate(() => document.body.innerText.includes('评价')), '评价段可切换')
  await p.screenshot({ path: OUT + '/chg2-orders-reviews.png' })

  ok(errs.length === 0, '无页面 JS 报错' + (errs.length ? '：' + errs.join('|') : ''))
  await b.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
