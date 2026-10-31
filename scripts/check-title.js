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

  // 注入：信誉 96 + 10 条他人委托已完成（作为接单人）
  const injected = await p.evaluate(() => {
    const key = 'campus_commission_state_v2'
    const rawStr = localStorage.getItem(key)
    if (!rawStr) return 'no-state'
    let raw = JSON.parse(rawStr)
    const st = raw && raw.data ? raw.data : raw
    const me = st.users.find(u => u.id === st.sessionUserId)
    if (!me) return 'no-me'
    me.credit = 96
    // 账号仓库是权威来源，信誉分要一起改，否则 mergeVault 会覆盖回旧值
    try {
      const vkey = 'campus_commission_accounts_v1'
      const vs = localStorage.getItem(vkey)
      if (vs) {
        let vr = JSON.parse(vs)
        const vault = vr && vr.data ? vr.data : vr
        if (vault && Array.isArray(vault.accounts)) {
          const acc = vault.accounts.find(a => a.id === me.id)
          if (acc) acc.credit = 96
          if (vr && vr.data) vr.data = vault
          localStorage.setItem(vkey, JSON.stringify(vr))
        }
      }
    } catch (e) {}
    const tpl = st.tasks.find(t => t.status === 'done') || st.tasks[0]
    const extra = []
    for (let i = 0; i < 10; i++) {
      extra.push(Object.assign({}, tpl, { id: 'zz' + i, assigneeId: me.id, publisherId: 'p' + i, status: 'done' }))
    }
    st.tasks = st.tasks.concat(extra)
    if (raw && raw.data) raw.data = st
    else raw = st
    localStorage.setItem(key, JSON.stringify(raw))
    return 'ok'
  })
  ok(injected === 'ok', '注入 10 条完成记录 + 信誉 96（' + injected + '）')

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(900)
  await p.locator('.p-title').click()
  await p.waitForTimeout(800)
  const t1 = await p.evaluate(() => document.body.innerText)
  console.log('--- title page text ---')
  console.log(t1.replace(/\n+/g, ' | ').slice(0, 700))
  ok(t1.includes('校园之星'), '称号详情页出现「校园之星」')
  const zhiTag = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.tcard')]
    const c = cards.find((x) => x.innerText.includes('校园之星'))
    const tag = c ? c.querySelector('.tcard-tag') : null
    return tag ? tag.innerText.trim() : ''
  })
  ok(zhiTag.includes('已获得') || zhiTag.includes('当前使用'), '「校园之星」显示为已获得（实际：' + zhiTag + '）')

  // 点「使用」切换到校园之星
  const useBtn = p.locator('.tcard-btn')
  const n = await useBtn.count()
  if (n > 0) {
    await useBtn.first().click()
    await p.waitForTimeout(700)
  }
  const curName = await p.locator('.tcard-on .tcard-name').first().innerText().catch(() => '')
  ok(curName.includes('校园之星'), '切换后当前称号为「校园之星」（实际：' + curName + '）')
  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
