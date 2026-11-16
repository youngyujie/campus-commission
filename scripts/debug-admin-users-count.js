// 诊断：接口返回条数 + 页面运行时异常（不输出任何账号内容）
const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()) })
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 40000 })
  await p.getByText('张老师', { exact: true }).first().click()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    if ((await p.evaluate(() => document.body.innerText)).includes('委托大厅')) break
  }
  await p.goto(BASE + '#/pages/admin/admin')
  await sleep(2500)
  await p.getByText('用户管理', { exact: false }).first().click()
  await sleep(4000)
  const probe = await p.evaluate(async () => {
    const raw = localStorage.getItem('cc_token_v1')
    let t = ''
    try { const o = JSON.parse(raw); t = typeof o === 'string' ? o : (o && o.data) || '' } catch (e) { t = raw || '' }
    let status = 0, count = -1, okFlag = false
    try {
      const r = await fetch('/api/admin/users?sharecode=L6JLE2TLA6', { headers: t ? { 'x-cc-token': t } : {} })
      status = r.status
      const j = await r.json()
      okFlag = !!j.ok
      count = Array.isArray(j.list) ? j.list.length : -1
    } catch (e) { status = -1 }
    return { hasToken: !!t, status, okFlag, count }
  })
  const dom = await p.evaluate(() => ({
    filters: document.querySelectorAll('.u-filter').length,
    cards: document.querySelectorAll('.user-card').length,
    tabOn: (document.querySelector('.tab-on') || {}).innerText || ''
  }))
  console.log('probe:', JSON.stringify(probe), 'dom:', JSON.stringify(dom))
  console.log('errors:', errs.slice(0, 5).join(' | ') || 'none')
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
