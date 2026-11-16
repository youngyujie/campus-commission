const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3103/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
async function waitHall(page, tries = 12) {
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(1000)
    const t = await page.evaluate(() => document.body.innerText)
    if (t.includes('委托大厅')) return true
  }
  return false
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 30000 })
  await p.getByText('林小满', { exact: true }).first().click()
  ok(await waitHall(p), '登录成功')

  // 6) 大厅只显示可接取（待接单）
  const statuses = await p.evaluate(() => [...document.querySelectorAll('.mcard-status, .tc-status')].map(x => x.innerText))
  console.log('hall statuses:', JSON.stringify([...new Set(statuses)]))
  ok(statuses.length > 0 && statuses.every(s => s === '待接单'), '大厅只显示「待接单」订单')

  // 7) 浏览记录：先点开一个订单
  const firstCard = (await p.locator('.mcard').count()) ? p.locator('.mcard').first() : p.locator('.tc').first()
  if (await firstCard.count()) {
    await firstCard.click()
    await p.waitForTimeout(1200)
    ok(p.url().includes('pages/detail'), '点开订单进入详情（记录浏览）')
    await p.goto(BASE + '#/pages/mine/mine')
    await p.waitForTimeout(1200)
    const mineText = await p.evaluate(() => document.body.innerText)
    ok(mineText.includes('浏览记录'), '「我的」出现「浏览记录」')
    const viewedRow = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.info-row')]
      const r = rows.find(x => x.innerText.includes('浏览记录'))
      return r ? r.innerText.replace(/\n/g, ' ') : ''
    })
    console.log('viewed row:', viewedRow)
    ok(/[1-9]\d* 条/.test(viewedRow), '浏览记录条数已更新')
    await p.getByText('浏览记录', { exact: true }).first().click()
    await p.waitForTimeout(1200)
    ok((await p.locator('.tc').count()) >= 1, '浏览记录页列出看过的订单')
  }

  // 1) 头像立即更新
  await p.goto(BASE + '#/pages/mine/mine')
  await p.waitForTimeout(1000)
  const before = await p.evaluate(() => {
    const e = document.querySelector('.avatar-hit .av-emoji')
    return e ? e.innerText : ''
  })
  await p.locator('.avatar-hit').click()
  await p.waitForTimeout(500)
  await p.getByText('更改头像', { exact: true }).click()
  await p.waitForTimeout(500)
  await p.getByText('系统自带头像', { exact: true }).click()
  await p.waitForTimeout(500)
  const opts = p.locator('.avatar-opt')
  const n = await opts.count()
  let picked = ''
  for (let i = 0; i < n; i++) {
    const t = await opts.nth(i).innerText()
    if (t.trim() && t.trim() !== before) { await opts.nth(i).click(); picked = t.trim(); break }
  }
  await p.waitForTimeout(600)
  const after = await p.evaluate(() => {
    const e = document.querySelector('.avatar-hit .av-emoji')
    return e ? e.innerText : ''
  })
  console.log('avatar before/after/picked:', JSON.stringify({ before, after, picked }))
  ok(after && after !== before, '切换头像后不切页面立即变化')

  // 2) 发布页无返回按钮
  await p.goto(BASE + '#/pages/publish/publish')
  await p.waitForTimeout(1200)
  ok((await p.locator('.hdr-back-icon').count()) === 0, '发布页左上角返回按钮已去掉')

  // 3/4/5) 好友搜索
  await p.goto(BASE + '#/pages/chat/chat')
  await p.waitForTimeout(1200)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(500)
  const input = p.locator('.search-input input')
  await input.focus()
  await p.waitForTimeout(500)
  ok((await p.locator('.tabbar-wrap').count()) === 0, '搜索框聚焦时底部导航隐藏')
  await p.locator('.search-title').click()
  await p.waitForTimeout(500)
  ok((await p.locator('.tabbar-wrap').count()) === 1, '退出搜索后底部导航恢复')
  await input.focus()
  await p.evaluate(() => {
    const el = document.querySelector('.search-input input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '13800000001')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const t0 = Date.now()
  await p.locator('.search-btn').click({ force: true })
  await p.waitForSelector('.ucard', { timeout: 15000 })
  console.log('search ms:', Date.now() - t0)
  ok((await p.locator('.ucard-self-text').count()) === 1, '搜到自己时卡片右侧显示「自己」')
  await p.locator('.ucard').first().click()
  await p.waitForTimeout(1200)
  ok((await p.locator('.bottom-bar').count()) === 0, '自己主页没有加好友/开始聊天按钮')

  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
