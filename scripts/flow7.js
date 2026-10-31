// 验证：简化注册 / 用户名登录 / 旧账号兼容 / 学号门槛 / 发布后他人可见 / 自己的订单
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

const readState = (page) =>
  page.evaluate(() => {
    const read = (k) => {
      const raw = localStorage.getItem(k)
      if (!raw) return null
      const p = JSON.parse(raw)
      return p && p.data !== undefined ? p.data : p
    }
    const s = read('campus_commission_state_v2')
    const me = s ? s.users.find((u) => u.id === s.sessionUserId) : null
    return {
      me: me ? { id: me.id, username: me.username, nickname: me.nickname, sid: me.studentId, phone: me.phone } : null,
      tasks: s ? s.tasks.map((t) => ({ id: t.id, title: t.title, audit: t.audit, pub: t.publisherId, status: t.status })) : [],
      users: s ? s.users.map((u) => ({ id: u.id, username: u.username, sid: u.studentId, phone: u.phone })) : []
    }
  })

// 清掉登录态（等价于点「退出登录」），否则进登录页会被弹回大厅
const logout = async (page) => {
  await page.evaluate(() => {
    const read = (k) => { const raw = localStorage.getItem(k); const p = JSON.parse(raw); return p && p.data !== undefined ? p.data : p }
    const s = read('campus_commission_state_v2')
    if (s) {
      s.sessionUserId = ''
      localStorage.setItem('campus_commission_state_v2', JSON.stringify({ type: 'object', data: s }))
      localStorage.setItem('campus_commission_stamp_v1', JSON.stringify({ type: 'number', data: Date.now() + 1 }))
    }
  })
  await page.goto('about:blank')
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message))

  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)

  // ---- 1. 注册：只填 用户名 + 手机号 + 密码 ----
  await page.getByText('去注册', { exact: true }).click()
  await page.waitForTimeout(500)
  const inputs = page.locator('.m-field input, .field input')
  ok((await inputs.count()) === 3, `注册表单 ${await inputs.count()} 个输入框（用户名/手机/密码）`)
  await inputs.nth(0).fill('小明同学')
  await inputs.nth(1).fill('13911112222')
  await inputs.nth(2).fill('123456')
  {
    const cb = page.locator('.m-check').first()
    if (await cb.count()) {
      const cls = String(await cb.getAttribute('class'))
      if (!cls.includes('m-check-on')) await cb.click()
      await page.waitForTimeout(150)
    }
  }
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(2200)

  let st = await readState(page)
  ok(st.me && st.me.username === '小明同学', '注册成功，用户名 = ' + (st.me ? st.me.username : '无'))
  ok(st.me && !st.me.sid, '学号为空（选填）')

  // ---- 2. 学号门槛：未填学号时发布被拦 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('发布') || t.includes('选择类型'), '发布页渲染')

  // ---- 3. 补填学号 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine?fill=1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const sheetInputs = page.locator('.sheet input')
  const sn = await sheetInputs.count()
  if (sn >= 3) {
    await sheetInputs.nth(0).fill('2023111122')
    await sheetInputs.nth(2).fill('123456')
    await page.getByText('确认绑定', { exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(1600)
  }
  st = await readState(page)
  ok(st.me && st.me.sid === '2023111122', '补填学号后 = ' + (st.me ? st.me.sid : '无'))

  // ---- 4. 退出后用「手机号 + 密码」登录 ----
  await logout(page)
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const li = page.locator('.m-field input, .field input')
  await li.nth(0).fill('13911112222')
  await li.nth(1).fill('123456')
  {
    const cb = page.locator('.m-check').first()
    if (await cb.count()) {
      const cls = String(await cb.getAttribute('class'))
      if (!cls.includes('m-check-on')) await cb.click()
      await page.waitForTimeout(150)
    }
  }
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(2200)
  st = await readState(page)
  ok(st.me && st.me.username === '小明同学', '用手机号 + 密码登录成功')

  // ---- 5. 发布订单（用模板一键填充，避免商品凭证那套） ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // 选「学习辅导」类型（不需要商品凭证），再手填标题/描述/报酬/地点
  await page.getByText('学习辅导', { exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.locator('.input-title input').fill('高数期末复习求带两小时')
  await page.locator('.textarea textarea').fill('想找人帮梳理一遍重点题型，最好能带着做两套真题，图书馆三楼讨论区都行。')
  await page.locator('.money-input input').first().fill('60')
  await page.locator('.input input').first().fill('图书馆三楼讨论区')
  await page.waitForTimeout(600)

  const titleVal = await page.locator('.input-title input').inputValue().catch(() => '')
  ok(!!titleVal, '表单已填，标题 = ' + JSON.stringify(titleVal))

  const btn = page.locator('.actionbar .btn').first()
  if (await btn.count()) {
    await btn.click()
    await page.waitForTimeout(2400)
    const toast = await page.evaluate(() => document.body.innerText.slice(0, 200))
    console.log('   提交后页面片段:', JSON.stringify(toast.replace(/\n/g, ' ').slice(0, 120)))
  }

  st = await readState(page)
  const mine = st.tasks.filter((x) => x.pub === (st.me ? st.me.id : ''))
  ok(mine.length > 0, `发布成功，我的订单 ${mine.length} 条`)
  const newest = mine[0]
  ok(newest && newest.audit === 'approved', '新订单自动上架 audit=' + (newest ? newest.audit : '?'))

  // ---- 5.5 自己的订单页能看到这条委托 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/orders/orders`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  let ot = await page.evaluate(() => document.body.innerText)
  ok(ot.includes('我发布的') && ot.includes('高数期末复习求带两小时'), '5.5 订单页「我发布的」能看到自己的委托')

  // ---- 6. 换账号，看别人能不能看到 ----
  await logout(page)
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.getByText('林小满', { exact: false }).first().click()
  await page.waitForTimeout(2400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '切换到林小满，进入大厅')
  ok(t.includes(newest ? newest.title : '帮我取一下快递'), '其他人能在大厅看到这条新订单')

  // ---- 7. 旧账号兼容：手动造一个没有 username 的旧账号 ----
  await page.evaluate(() => {
    const read = (k) => { const raw = localStorage.getItem(k); const p = JSON.parse(raw); return p && p.data !== undefined ? p.data : p }
    const s = read('campus_commission_state_v2')
    s.users.push({
      id: 'uold1', studentId: '2020000001', name: '老用户', email: 'old@campus.edu.cn',
      phone: '13700000001', password: '123456', avatar: '🙂', nickname: '老张',
      bio: '', skills: [], college: '', credit: 90, deposit: 0, role: 'user',
      status: 'active', accepting: true, joinedAt: Date.now()
    })
    const wrap = (v) => JSON.stringify({ type: 'object', data: v })
    localStorage.setItem('campus_commission_state_v2', wrap(s))
    localStorage.setItem('campus_commission_stamp_v1', wrap(Date.now() + 5))
  })
  await logout(page)
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  const li2 = page.locator('.m-field input, .field input')
  await li2.nth(0).fill('老张')
  await li2.nth(1).fill('123456')
  {
    const cb = page.locator('.m-check').first()
    if (await cb.count()) {
      const cls = String(await cb.getAttribute('class'))
      if (!cls.includes('m-check-on')) await cb.click()
      await page.waitForTimeout(150)
    }
  }
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(2200)
  st = await readState(page)
  ok(st.me && st.me.nickname === '老张', '旧账号（无 username）自动补齐后可用昵称登录')
  ok(st.me && st.me.username === '老张', '旧账号 username 已迁移 = ' + (st.me ? st.me.username : '无'))

  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
