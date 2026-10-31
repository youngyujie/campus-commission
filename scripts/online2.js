// 线上验收：确认新版本真的生效
const { chromium } = require('playwright-core')
const URL = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ---------- 桌面端 ----------
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const derr = []
  d.on('pageerror', (e) => derr.push(e.message))
  const t0 = Date.now()
  await d.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await d.waitForTimeout(3000)
  console.log('桌面首屏耗时:', Date.now() - t0, 'ms')
  let t = await d.evaluate(() => document.body.innerText)
  ok(t.includes('放心托付，靠谱接单'), '1 桌面端新版登录页（含标语）')
  ok(await d.locator('.card').count() > 0, '2 桌面端米白卡片已渲染')
  await d.screenshot({ path: 'preview/90-online-desktop.png' })
  await d.close()

  // ---------- 手机端 ----------
  const m = await b.newPage({ viewport: { width: 390, height: 844 } })
  const merr = []
  m.on('pageerror', (e) => merr.push(e.message))
  await m.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await m.waitForTimeout(3000)
  ok(await m.locator('.m').count() > 0, '3 手机端走独立布局')
  await m.getByText('去注册', { exact: true }).click()
  await m.waitForTimeout(800)
  const n = await m.locator('.m-field input').count()
  ok(n === 3, `4 手机端注册 ${n} 个输入框（用户名/手机号/密码）`)
  ok(await m.locator('.m-check').count() > 0, '5 手机端有协议勾选框')
  await m.screenshot({ path: 'preview/91-online-mobile-register.png' })

  // ---------- 登录 + 搜好友 ----------
  await m.getByText('返回登录', { exact: true }).click()
  await m.waitForTimeout(700)
  await m.getByText('林小满', { exact: false }).first().click()
  await m.waitForTimeout(3000)
  t = await m.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '6 线上可正常登录进入大厅')

  await m.goto(URL + '#/pages/chat/chat', { waitUntil: 'domcontentloaded' })
  await m.waitForTimeout(2500)
  await m.getByText('好友', { exact: false }).first().click()
  await m.waitForTimeout(900)
  t = await m.evaluate(() => document.body.innerText)
  ok(t.includes('按手机号找同学'), '7 线上有手机号搜好友')

  const inp = m.locator('.search-input input').first()
  await inp.fill('13800000005')
  await m.locator('.search-btn').first().click()
  await m.waitForTimeout(1000)
  t = await m.evaluate(() => document.body.innerText)
  ok(t.includes('138****0005'), '8 搜索返回脱敏手机号')
  await m.screenshot({ path: 'preview/92-online-search.png' })

  console.log('桌面报错:', derr.length ? derr[0].slice(0, 120) : '无')
  console.log('手机报错:', merr.length ? merr[0].slice(0, 120) : '无')
  await b.close()
})()
