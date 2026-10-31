const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(FILE, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.getByText('林小满', { exact: true }).first().click()
  await p.waitForTimeout(1400)
  // 自己的主页
  const uid = await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('campus_commission_state_v2'))
    const st = raw && raw.data ? raw.data : raw
    return st.sessionUserId
  })
  await p.goto(FILE + '#/pages/profile/profile?id=' + uid)
  await p.waitForTimeout(900)
  ok((await p.locator('.h-avatar-edit').count()) === 0, '自己主页头像上不再有铅笔角标')
  await p.locator('.h-avatar-wrap .av').click()
  await p.waitForTimeout(600)
  const t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('更改头像') && t.includes('历史头像'), '自己主页点头像弹出更改头像/历史头像')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
