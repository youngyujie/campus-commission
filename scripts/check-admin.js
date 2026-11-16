const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForSelector('.m-input', { timeout: 25000 })
  await p.waitForSelector('input.uni-input-input', { timeout: 25000 })
  await p.waitForTimeout(800)
  // 同意协议
  const agree = p.locator('.m-agree')
  if (await agree.count()) { await agree.click(); await p.waitForTimeout(200) }
  // 手机号 + 密码
  await p.locator('input.uni-input-input').nth(0).focus()
  await p.keyboard.type('17381081281', { delay: 30 })
  await p.locator('input.uni-input-input').nth(1).focus()
  await p.keyboard.type('123456', { delay: 30 })
  await p.locator('.m-submit').click({ force: true })
  await p.waitForTimeout(3000)
  const t1 = await p.evaluate(() => document.body.innerText)
  ok(t1.includes('委托大厅'), '管理员账号登录成功')

  // 我的 → 管理后台
  await p.getByText('我的', { exact: true }).last().click()
  await p.waitForTimeout(1200)
  const t2 = await p.evaluate(() => document.body.innerText)
  ok(t2.includes('管理后台'), '「我的」出现「管理后台」入口')
  const adminItem = p.getByText('管理后台', { exact: true }).first()
  if (await adminItem.count()) {
    await adminItem.click()
    await p.waitForTimeout(1500)
    const t3 = await p.evaluate(() => document.body.innerText)
    ok(t3.includes('审核') || t3.includes('委托管理') || t3.includes('用户'), '管理后台页面可打开')
  }
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
