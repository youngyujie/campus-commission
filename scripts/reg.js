// 验证注册：用户名 + 手机号必填，学号选填；唯一性校验
const { chromium } = require('playwright-core')

const BASE = 'http://127.0.0.1:5180'
const KEY = 'campus_commission_state_v2'
const ok = (c, m) => console.log((c ? 'OK ' : '✗  ') + m)

async function readUsers(page) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    let s = JSON.parse(raw)
    if (s && s.data) s = s.data
    return {
      session: s.sessionUserId,
      users: s.users.map((u) => ({ id: u.id, username: u.username, sid: u.studentId, phone: u.phone }))
    }
  }, KEY)
}

async function openRegister(page) {
  // 已登录时先退出，否则登录页会自动跳回大厅
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const txt = await page.evaluate(() => document.body.innerText)
  if (txt.includes('退出登录')) {
    await page.getByText('退出登录', { exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByText('退出', { exact: true }).last().click()
    await page.waitForTimeout(1300)
  }
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  await page.getByText('去注册', { exact: true }).click()
  await page.waitForTimeout(600)
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e && e.message)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push('[console] ' + m.text())
  })

  await page.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await openRegister(page)

  // 表单顺序：用户名 / 手机号 / 学号 / 密码
  const inp = page.locator('.m-field input, .field input')
  ok((await inp.count()) === 3, `注册表单 ${await inp.count()} 个输入框（用户名/手机/密码，学号已从注册页移除）`)

  const fill = async (username, phone, sid, pwd) => {
    await inp.nth(0).fill(username)
    await inp.nth(1).fill(phone)
    await inp.nth(2).fill(pwd)
  }
  const ensureAgree = async () => {
    const cb = page.locator('.m-check').first()
    if (!(await cb.count())) return
    const cls = String(await cb.getAttribute('class'))
    if (!cls.includes('m-check-on')) await cb.click()
    await page.waitForTimeout(150)
  }
  const submit = async () => {
    await ensureAgree()
    await page.locator('.submit, .m-submit').click()
    await page.waitForTimeout(900)
    return page.evaluate(() => document.body.innerText)
  }

  await fill('A', '13900000001', '', '123456')
  let t = await submit()
  ok(t.includes('用户名需 2-12 位'), '1 用户名过短被拦截')

  await fill('李小明', '139', '', '123456')
  t = await submit()
  ok(t.includes('请填写 11 位手机号'), '2 手机号格式校验')

  await fill('李小明', '13900000001', '', '123')
  t = await submit()
  ok(t.includes('密码至少 6 位'), '3 密码长度校验')

  await fill('李小明', '13900000001', '', '123456')
  t = await submit()
  ok(t.includes('今天需要帮忙做点什么'), '4 注册后直接登录（学号由系统后续引导补填）')
  const st = await readUsers(page)
  const me = st.users.find((u) => u.id === st.session)
  ok(me && me.sid === '' && me.phone === '13900000001', '6 新账号学号为空、手机号已存：' + JSON.stringify(me))
  ok(me && me.username === '李小明', '7 用户名已存')

  await openRegister(page)
  await fill('李小明', '13900000002', '', '123456')
  t = await submit()
  ok(t.includes('这个用户名已被使用'), '8 用户名查重生效')

  await fill('王二', '13900000001', '', '123456')
  t = await submit()
  ok(t.includes('这个手机号已经注册过了'), '9 手机号查重生效')

  // 学号已从注册页移除，查重改由「补填学号」流程覆盖（flow5）

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
