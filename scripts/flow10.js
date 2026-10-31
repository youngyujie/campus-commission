// 验证：手机号搜索好友 + 手机端注册需勾选协议 + 桌面端不需要
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
      me: me ? { id: me.id, nickname: me.nickname } : null,
      friends: s ? (s.friends || []).map((f) => ({ a: f.aId, b: f.bId, st: f.status })) : []
    }
  })

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ================= A. 手机号搜好友（手机视口） =================
  const page = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message))

  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('林小满', { exact: false }).first().click()
  await page.waitForTimeout(2400)

  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/chat/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByText('好友', { exact: false }).first().click()
  await page.waitForTimeout(900)

  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('按手机号找同学'), '1 好友页出现手机号搜索入口')

  const input = page.locator('.search-input input').first()
  const searchBtn = page.locator('.search-btn').first()

  // 1) 位数不足
  await input.fill('138')
  await searchBtn.click()
  await page.waitForTimeout(700)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('完整的 11 位手机号'), '2 位数不足时提示输入完整手机号')

  // 2) 不存在的号码
  await input.fill('13900000000')
  await searchBtn.click()
  await page.waitForTimeout(700)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('没有找到'), '3 不存在的号码给出提示')

  // 3) 已是好友：何知微 13800000005
  await input.fill('13800000005')
  await searchBtn.click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('知微') || t.includes('何知微'), '4 搜到已是好友的同学')
  ok(t.includes('已是好友'), '5 关系状态显示「已是好友」')
  ok(t.includes('138****0005'), '6 手机号做了脱敏')

  // 4) 陌生人：苏晴 13800000003 → 加好友
  await input.fill('13800000003')
  await searchBtn.click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('138****0003'), '7 搜到陌生人（苏晴 138****0003）')
  ok(t.includes('加好友'), '8 陌生人显示「加好友」按钮')

  await page.getByText('加好友', { exact: true }).first().click()
  await page.waitForTimeout(1400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已发送') || t.includes('已申请') || t.includes('好友申请已发送'), '9 点击后发出好友申请')

  const st = await readState(page)
  const hasPending = st.friends.some((f) => f.st === 'pending')
  ok(hasPending, '10 数据层已写入好友申请')

  await page.screenshot({ path: 'preview/86-friend-search.png', fullPage: true })

  // ================= B. 手机端注册需勾选协议 =================
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText('去注册', { exact: true }).click()
  await page.waitForTimeout(700)

  const minp = page.locator('.m-field input')
  ok((await minp.count()) === 3, `11 手机端注册 ${await minp.count()} 个输入框（学号已移除）`)
  await minp.nth(0).fill('协议测试')
  await minp.nth(1).fill('13977776666')
  await minp.nth(2).fill('123456')

  await page.locator('.m-submit').click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('请先勾选'), '12 未勾选协议时被拦截')

  await page.locator('.m-check').first().click()
  await page.waitForTimeout(300)
  await page.locator('.m-submit').click()
  await page.waitForTimeout(2400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '13 勾选后注册成功并进入大厅')

  await page.close()

  // ================= C. 桌面端不需要勾选 =================
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await d.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await d.evaluate(() => localStorage.clear())
  await d.goto('about:blank')
  await d.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await d.waitForTimeout(2000)
  t = await d.evaluate(() => document.body.innerText)
  ok(t.includes('欢迎回来') && !t.includes('创建账号'), '14 桌面端渲染独立布局')
  ok(!t.includes('我已阅读并同意'), '15 桌面端不出现协议勾选框')

  await d.getByText('去注册', { exact: true }).click()
  await d.waitForTimeout(700)
  const dinp = d.locator('.field input')
  await dinp.nth(0).fill('桌面测试')
  await dinp.nth(1).fill('13977775555')
  await dinp.nth(2).fill('123456')
  await d.locator('.submit').click()
  await d.waitForTimeout(2400)
  t = await d.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '16 桌面端不勾选也能直接注册')

  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
