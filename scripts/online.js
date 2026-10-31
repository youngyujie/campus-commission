// 验证线上链接：真浏览器打开，检查能否进入首页、登录、业务是否可用
const { chromium } = require('playwright-core')

const URL = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))

  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const tLoad = Date.now() - t0
  await page.waitForTimeout(2500)

  let t = await page.evaluate(() => document.body.innerText)
  console.log('首屏耗时:', tLoad + 'ms')
  console.log('首屏文本前 80 字:', JSON.stringify(t.slice(0, 80).replace(/\n/g, ' ')))

  // 一键登录学生账号
  const demo = page.getByText('林小满', { exact: false }).first()
  if (await demo.count()) {
    await demo.click()
    await page.waitForTimeout(2500)
  }

  t = await page.evaluate(() => document.body.innerText)
  console.log('登录后是否进大厅:', t.includes('今天需要帮忙做点什么') ? 'OK' : '✗')
  console.log('大厅文本前 100 字:', JSON.stringify(t.slice(0, 100).replace(/\n/g, ' ')))

  // 能否点开一条订单
  const card = page.locator('.tc').first()
  if (await card.count()) {
    await card.click()
    await page.waitForTimeout(1800)
    t = await page.evaluate(() => document.body.innerText)
    console.log('进入订单详情:', t.includes('订单详情') ? 'OK' : '✗')
    console.log('详情页有无交流区:', t.includes('订单交流') ? 'OK' : '✗')
  } else {
    console.log('大厅未渲染出订单卡片 ✗')
  }

  await page.screenshot({ path: 'preview/40-online.png' })
  console.log('运行时报错:', errors.length ? errors.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
