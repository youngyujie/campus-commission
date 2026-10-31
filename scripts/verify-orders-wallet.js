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
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.tab .tab-label')].map((e) => e.textContent.trim()))
  ok(!tabs.includes('订单'), '底部导航已无「订单」: ' + JSON.stringify(tabs))
  ok(tabs.length === 4, '底部导航 4 项')

  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1200)
  const menu = await p.evaluate(() => [...document.querySelectorAll('.menu-label')].map((e) => e.textContent.trim()))
  ok(menu.includes('我的订单') && menu.includes('我的钱包') && menu.includes('我的主页'), '我的页菜单: ' + JSON.stringify(menu))
  await p.screenshot({ path: OUT + '/chg-mine.png' })

  await p.getByText('我的订单', { exact: true }).click()
  await p.waitForTimeout(1300)
  const body1 = await p.evaluate(() => document.body.innerText)
  ok(body1.includes('我发布的') && body1.includes('收藏'), '订单系统页已加载（我发布的/我接的/收藏）')
  await p.screenshot({ path: OUT + '/chg-orders.png' })

  await p.locator('.hdr-back').first().click()
  await p.waitForTimeout(900)
  await p.getByText('我的钱包', { exact: true }).click()
  await p.waitForTimeout(1200)
  const body2 = await p.evaluate(() => document.body.innerText)
  ok(body2.includes('累计收入') && body2.includes('净收入'), '钱包页已加载（累计收入/净收入）')
  ok(!body2.includes('我的资料'), '钱包页不含个人资料')
  await p.screenshot({ path: OUT + '/chg-wallet.png' })

  // 桌面：侧边导航无「我的订单」
  const d = await b.newContext({ viewport: { width: 1280, height: 860 } })
  const dp = await d.newPage()
  dp.on('pageerror', (e) => errs.push('desk:' + String(e)))
  await login(dp)
  const sn = await dp.evaluate(() => [...document.querySelectorAll('.sn-label')].map((e) => e.textContent.trim()))
  ok(!sn.includes('我的订单'), '桌面侧栏已无「我的订单」: ' + JSON.stringify(sn))
  await dp.screenshot({ path: OUT + '/chg-desktop.png' })
  await d.close()

  ok(errs.length === 0, '无页面 JS 报错' + (errs.length ? '：' + errs.join('|') : ''))
  await b.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
