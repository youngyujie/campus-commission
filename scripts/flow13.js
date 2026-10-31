// 验证：注册后换错号码登录 → 报错说清原因 + 本机账号自查 + 一键带回
const { chromium } = require('playwright-core')
const BASE = process.argv[2] || 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

const logout = async (p) => {
  await p.evaluate(() => {
    const read = (k) => {
      const raw = localStorage.getItem(k)
      const o = JSON.parse(raw)
      return o && o.data !== undefined ? o.data : o
    }
    const s = read('campus_commission_state_v2')
    if (s) {
      s.sessionUserId = ''
      localStorage.setItem('campus_commission_state_v2', JSON.stringify({ type: 'object', data: s }))
      localStorage.setItem('campus_commission_stamp_v1', JSON.stringify({ type: 'number', data: Date.now() + 1 }))
    }
  })
  await p.goto('about:blank')
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  await p.goto(`${BASE}#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await p.goto(`${BASE}#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  // 1. 注册
  await p.getByText('去注册', { exact: true }).click()
  await p.waitForTimeout(700)
  const inp = p.locator('.m-field input')
  await inp.nth(0).fill('找回测试')
  await inp.nth(1).fill('13900001111')
  await inp.nth(2).fill('123456')
  await p.locator('.m-check').first().click()
  await p.waitForTimeout(200)
  await p.locator('.m-submit').click()
  await p.waitForTimeout(2400)
  let t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '1 注册成功')

  // 2. 退出，用没注册过的手机号登录
  await logout(p)
  await p.goto(`${BASE}#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  const mi = p.locator('.m-field input')
  await mi.nth(0).fill('13900002222')
  await mi.nth(1).fill('123456')
  await p.locator('.m-submit').click()
  await p.waitForTimeout(1600)

  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('本机没有这个账号'), '2 报错说明是「本机没有」，而不是含糊的「未注册」')
  ok(t.includes('只存在当前浏览器'), '3 报错里说明了数据只在本浏览器')

  // 3. 本机账号自动展开，能看到刚才注册的号（脱敏）
  const opened = await p.locator('.local-list').count()
  ok(opened > 0, '4 登录失败后自动展开「本机已注册账号」')
  ok(t.includes('139****1111'), '5 列表里能看到刚注册的手机号（脱敏）')
  ok(t.includes('找回测试'), '6 列表里显示昵称')

  await p.screenshot({ path: 'preview/150-local-accounts.png' })

  // 4. 点一下带回登录框
  await p.locator('.local-item').first().click()
  await p.waitForTimeout(600)
  const filled = await p.locator('.m-field input').first().inputValue()
  ok(filled === '13900001111', '7 点账号自动填回手机号：' + filled)

  // 5. 再登录
  const mi2 = p.locator('.m-field input')
  await mi2.nth(1).fill('123456')
  await p.locator('.m-submit').click()
  await p.waitForTimeout(2400)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '8 用带回的号码登录成功')

  console.log('运行时报错:', errs.length ? errs.slice(0, 2).join(' | ') : '无')
  await b.close()
})()
