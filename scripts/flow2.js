// 全链路验证：登录 → 接单(押金) → 开工 → 交付 → 交流 → 验收 → 评价 → 信用分
// 另外验证：违规词拦截、审核上架、管理员用户管理
const { chromium } = require('playwright-core')

const BASE = 'http://127.0.0.1:5180'
const KEY = 'campus_commission_state_v2'
const ok = (c, m) => console.log((c ? 'OK ' : '✗  ') + m)

async function readState(page) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    let s = JSON.parse(raw)
    if (s && s.data) s = s.data
    return s
  }, KEY)
}

async function credits(page) {
  const s = await readState(page)
  if (!s) return {}
  const o = {}
  s.users.forEach((u) => (o[u.name] = u.credit))
  return o
}

async function logout(page) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.getByText('退出登录', { exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByText('退出', { exact: true }).last().click()
  await page.waitForTimeout(1300)
}

async function loginAs(page, acc, pwd) {
  // 登录改成手机号 + 密码后，旧用例里的学号/用户名统一映射成手机号
  const PHONE_OF = {
    '2023010101': '13800000001',
    '2022010202': '13800000002',
    '2024010303': '13800000003',
    '2021010404': '13800000004',
    '2023020505': '13800000005',
    '13800000006': '13800000006',
    admin: '13800000000'
  }
  acc = PHONE_OF[String(acc || '').trim()] || acc
  const txt = await page.evaluate(() => document.body.innerText)
  if (!txt.includes('演示账号')) await logout(page)
  await page.waitForTimeout(600)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(acc)
  await inputs.nth(1).fill(pwd)
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(1600)
}

async function openDetail(page, id) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/detail/detail?id=${id}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1100)
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
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)

  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('演示账号'), '0 未登录时跳转登录页')

  await loginAs(page, '2023010101', '123456')
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '1 大厅渲染')
  ok(t.includes('待接单'), '2 统计栏渲染')

  // ---- 苏晴接单（押金 100）----
  await loginAs(page, '2024010303', '123456')
  await openDetail(page, 't8')
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('接取订单（押金 ¥100）'), '3 未缴押金时按钮显示所需押金')
  await page.getByText('接取订单（押金 ¥100）', { exact: true }).click()
  await page.waitForTimeout(800)
  await page.getByText('缴纳并接单', { exact: true }).click()
  await page.waitForTimeout(1400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('开始处理'), '4 接单成功，状态→已接单')

  // ---- 开工 + 交流 + 交付 ----
  await page.getByText('开始处理', { exact: true }).click()
  await page.waitForTimeout(900)
  await page.locator('.dm-input input').fill('素材已收到，今晚给你初版')
  await page.getByText('发送', { exact: true }).click()
  await page.waitForTimeout(800)
  await page.getByText('提交交付成果', { exact: true }).click()
  await page.waitForTimeout(700)
  await page.locator('.sheet input').nth(0).fill('招新短片-成片.mp4')
  await page.locator('.sheet textarea').fill('2 分 10 秒，加了字幕和转场')
  await page.getByText('提交', { exact: true }).last().click()
  await page.waitForTimeout(1100)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已交付，等待对方验收'), '5 交付成功，状态→待验收')

  // ---- 委托人验收 + 评价 ----
  const before = await credits(page)
  await loginAs(page, '2021010404', '123456')
  await openDetail(page, 't8')
  await page.getByText('验收并确认完成', { exact: true }).click()
  await page.waitForTimeout(600)
  await page.getByText('确认完成', { exact: true }).last().click()
  await page.waitForTimeout(1300)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已完成') && t.includes('评价对方'), '6 验收完成，出现评价入口')

  await page.getByText('评价对方', { exact: true }).click()
  await page.waitForTimeout(1000)
  await page.getByText('准时守信', { exact: true }).click()
  await page.locator('textarea').fill('剪得很顺，还主动加了字幕')
  await page.getByText('提交评价', { exact: true }).click()
  await page.waitForTimeout(1400)

  const after = await credits(page)
  ok(after['周野'] === before['周野'] + 2, `7 委托人信用分 ${before['周野']} → ${after['周野']}（+2）`)
  ok(
    after['苏晴'] === before['苏晴'] + 2 + 3,
    `8 接单人信用分 ${before['苏晴']} → ${after['苏晴']}（+2 完成 +3 好评）`
  )

  // ---- 违规词拦截 ----
  await loginAs(page, '2023010101', '123456')
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  await page.getByText('学习辅导', { exact: true }).click()
  await page.locator('.input-title input').fill('求代考高数期末，价格好商量')
  await page.locator('.textarea textarea').fill('下周高数期末考试，希望有人能替我进考场，价格可以谈。')
  await page.locator('.money-input input').first().fill('150')
  await page.locator('.input input').first().fill('教学楼 B 座')
  await page.waitForTimeout(400)
  await page.locator('.actionbar .btn').first().click()
  await page.waitForTimeout(1200)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('无法发布') && t.includes('代考'), '9 违规词在发布前被拦截')
  await page.getByText('我知道了', { exact: true }).click()
  await page.waitForTimeout(500)

  // ---- 正常发布 → 直接上架（合规内容不再需要人工审核）----
  await page.locator('.input-title input').fill('帮忙打印装订一份报告')
  await page.locator('.textarea textarea').fill('PDF 已排好版，A4 双面 28 页，需要胶装，费用另算。')
  await page.locator('.money-input input').first().fill('15')
  await page.locator('.input input').first().fill('教学楼 A 座打印店')
  await page.waitForTimeout(300)
  await page.locator('.actionbar .btn').first().click()
  await page.waitForTimeout(1800)

  let s = await readState(page)
  const newest = s.tasks[0]
  ok(newest.audit === 'approved', `10 合规内容发布后直接上架（audit=${newest.audit}）`)

  // ---- 管理后台 ----
  await loginAs(page, 'admin', 'admin888')
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/admin/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('注册学生'), '11 管理后台概览渲染')

  await page.getByText('审核与下架').first().click()
  await page.waitForTimeout(1100)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('帮忙打印装订一份报告'), '12 已上架列表能看到这条订单')
  ok(t.includes('下架'), '13 管理员保留违规下架能力')

  await page.getByText('用户管理').first().click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('2023010101'), '14 用户列表显示学号')

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
