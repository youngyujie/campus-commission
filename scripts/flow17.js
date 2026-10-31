// 验证：去掉 AI、头像大图、历史头像、订单卡接单人头像
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

async function loginAs(page, phone, pwd) {
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const inp = page.locator('.m-field input, .field input')
  await inp.nth(0).fill(phone)
  await inp.nth(1).fill(pwd)
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(2200)
}

const readState = (page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('campus_commission_state_v2')
    if (!raw) return null
    try {
      const o = JSON.parse(raw)
      return o && o.data !== undefined ? o.data : o
    } catch (e) {
      return null
    }
  })

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await loginAs(p, '13800000001', '123456')

  // ---------- 1. 大厅不再有 AI ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  let t = await p.evaluate(() => document.body.innerText)
  ok(!/\bAI\b/.test(t), '1 大厅没有「AI」字样')
  ok(t.includes('今天需要帮忙做点什么'), '2 标题改成普通问候')
  ok(t.includes('搜索委托'), '3 AI 输入框变成搜索框')
  await p.screenshot({ path: 'preview/250-hall-no-ai.png' })

  // ---------- 2. 我的：点头像看大图 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.locator('.avatar-hit').first().click()
  await p.waitForTimeout(900)
  ok((await p.locator('.av-mask').count()) === 1, '4 点自己头像弹出大图')
  await p.screenshot({ path: 'preview/251-avatar-viewer.png' })
  await p.locator('.av-mask').click()
  await p.waitForTimeout(600)
  ok((await p.locator('.av-mask').count()) === 0, '5 点一下大图关掉')

  // ---------- 3. 历史头像：默认空，emoji 不写入 ----------
  await p.getByText('历史头像', { exact: false }).first().click()
  await p.waitForTimeout(800)
  ok((await p.locator('.hist-panel').count()) === 1, '6 打开历史头像面板')
  let ht = await p.evaluate(() => document.body.innerText)
  ok(ht.includes('还没有历史头像'), '7 初始为空')
  await p.locator('.hist-close').click()
  await p.waitForTimeout(500)

  // 换 emoji 头像：不应进历史
  await p.locator('.avatar-cam').first().click()
  await p.waitForTimeout(900)
  await p.getByText('换个 emoji 头像', { exact: false }).first().click()
  await p.waitForTimeout(1200)
  const st = await readState(p)
  const me = st && st.users.find((u) => u.id === st.sessionUserId)
  ok(!!me && String(me.avatar).indexOf('data:image') !== 0, '8 已换成 emoji 头像')
  ok(!!me && Array.isArray(me.avatarHistory) && me.avatarHistory.length === 0, '9 系统/emoji 头像不写进历史')

  // ---------- 4. 订单页：已接单的卡片显示接单人头像 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/orders/orders`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  const cards = await p.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.tc'))
    return list.map((c) => ({
      title: (c.querySelector('.tc-title') || {}).innerText || '',
      avatars: c.querySelectorAll('.tc-user .av').length,
      taker: (c.querySelector('.tc-taker') || {}).innerText || ''
    }))
  })
  const withTaker = cards.filter((c) => c.taker)
  ok(cards.length > 0, `10 订单列表有 ${cards.length} 条`)
  ok(
    withTaker.length > 0 && withTaker.every((c) => c.avatars >= 2),
    `11 已接单的卡片有接单人头像（${withTaker.length} 条带「接」标记，头像数 ${withTaker.map((c) => c.avatars).join('/')}）`
  )
  await p.screenshot({ path: 'preview/252-orders-avatars.png' })

  // ---------- 5. 历史头像：点一张直接换上 ----------
  // 自动化拿不到文件框，这里直接往 state 里塞一张「曾经上传过」的图来模拟
  await p.evaluate(() => {
    const KEY = 'campus_commission_state_v2'
    const raw = localStorage.getItem(KEY)
    const o = JSON.parse(raw)
    const s = o.data !== undefined ? o.data : o
    const me = s.users.find((u) => u.id === s.sessionUserId)
    // 1x1 红色像素，够用
    const px =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    me.avatarHistory = [px]
    localStorage.setItem(KEY, JSON.stringify(o))
  })
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.getByText('历史头像', { exact: false }).first().click()
  await p.waitForTimeout(800)
  const histCount = await p.locator('.hist-item').count()
  ok(histCount === 1, `12 历史里出现 ${histCount} 张`)
  await p.locator('.hist-item').first().click()
  await p.waitForTimeout(1200)
  const st2 = await readState(p)
  const me2 = st2 && st2.users.find((u) => u.id === st2.sessionUserId)
  ok(!!me2 && String(me2.avatar).indexOf('data:image') === 0, '13 点历史头像后直接换上了')
  ok((await p.locator('.hist-panel').count()) === 0, '14 选完自动关闭面板')

  // ---------- 6. 他人主页点头像也能放大 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/profile/profile?id=u2`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.locator('.h-avatar-wrap').first().click()
  await p.waitForTimeout(900)
  ok((await p.locator('.av-mask').count()) === 1, '15 别人主页点头像也能放大查看')

  console.log('运行时报错:', errs.length ? errs.slice(0, 2).join(' | ') : '无')
  await b.close()
})()
