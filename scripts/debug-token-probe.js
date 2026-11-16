// 诊断：只记录状态码与布尔标志，不输出任何凭证内容
const { chromium } = require('playwright-core')
const BASE = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const logs = []
  p.on('response', r => {
    const u = r.url()
    if (u.includes('/api/')) logs.push(u.split('?')[0].replace('https://campus-commission-35470.apps.workbuddy.host', '') + '=' + r.status())
  })
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 40000 })
  await p.getByText('张老师', { exact: true }).first().click()
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    if ((await p.evaluate(() => document.body.innerText)).includes('委托大厅')) break
  }
  const probe = await p.evaluate(async () => {
    const raw = localStorage.getItem('cc_token_v1')
    let t = ''
    try {
      const o = JSON.parse(raw)
      t = typeof o === 'string' ? o : (o && o.data) || ''
    } catch (e) { t = raw || '' }
    const has = !!t
    const segs = t ? t.split('.').length : 0
    const hdr = has ? { 'x-cc-token': t } : {}
    let getStatus = 0, postStatus = 0
    try {
      const g = await fetch('/api/admin/users?sharecode=L6JLE2TLA6', { headers: hdr })
      getStatus = g.status
    } catch (e) { getStatus = -1 }
    try {
      const q = await fetch('/api/admin/users?sharecode=L6JLE2TLA6', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, hdr),
        body: '{}'
      })
      postStatus = q.status
    } catch (e) { postStatus = -1 }
    return { hasToken: has, segments: segs, getStatus, postStatus }
  })
  console.log('probe:', JSON.stringify(probe))
  console.log('api calls:', logs.join(' ; ').slice(-500))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
