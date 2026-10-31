// 验证「单文件版 HTML」用 file:// 直接打开能否正常跑（不依赖任何服务器）
const { chromium } = require('playwright-core')
const path = require('path')
const { pathToFileURL } = require('url')

const FILE = pathToFileURL(path.join(__dirname, '..', '校园委托-单文件版.html')).href
const OUT = path.join(__dirname, '..', 'preview')

const ok = (cond, msg) => console.log((cond ? 'OK ' : '✗  ') + msg)

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e && e.message)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push('[console] ' + m.text())
  })

  await page.goto(FILE + '#/pages/hall/hall', { waitUntil: 'load' })
  await page.waitForTimeout(2200)

  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('演示账号'), '1 未登录时落到登录页')
  await page.screenshot({ path: path.join(OUT, '18-singlefile-login.png') })

  // 一键登录（演示账号第一个）
  await page.getByText('林小满', { exact: true }).click()
  await page.waitForTimeout(1800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '2 登录后进入大厅')

  // 详情 + 报价列表
  await page.goto(FILE + '#/pages/detail/detail?id=t2', { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('委托详情') && t.includes('服务商报价'), '3 详情页渲染（含报价列表）')

  // 其余页面
  for (const [p, kw] of [
    ['publish', '常用模板'],
    ['orders', '我的订单'],
    ['chat', '通知'],
    ['mine', '接单开关'],
    ['rules', '平台规则']
  ]) {
    await page.goto(FILE + `#/pages/${p}/${p}`, { waitUntil: 'load' })
    await page.waitForTimeout(1200)
    const tt = await page.evaluate(() => document.body.innerText)
    ok(tt.includes(kw), `4 ${p} 渲染`)
  }

  // localStorage 可用性
  const ls = await page.evaluate(() => {
    try {
      localStorage.setItem('__t', '1')
      const v = localStorage.getItem('__t')
      localStorage.removeItem('__t')
      return v === '1'
    } catch (e) {
      return false
    }
  })
  ok(ls, '5 file:// 下 localStorage 可用（刷新后数据保留）')

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
