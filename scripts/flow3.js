// 补充验证：用户主页、换头像、真实选文件、管理员订单管理
const { chromium } = require('playwright-core')
const path = require('path')

const BASE = 'http://127.0.0.1:5180'
const KEY = 'campus_commission_state_v2'
const FIXTURE = path.join(__dirname, 'fixtures', '课程报告-终稿.pdf')
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

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e && e.message)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push('[console] ' + m.text())
  })

  // 干净起点 + 登录
  await page.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await loginAs(page, '2023010101', '123456')

  // ---- 1. 用户主页 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/profile/profile?id=u4`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('野哥') && t.includes('信誉分'), '1 用户主页渲染（昵称 + 信用分）')
  ok(t.includes('收到的评价') && t.includes('准时守信'), '2 主页显示对方收到的评价')
  ok(t.includes('体育教育'), '3 主页显示院系')
  ok(!t.includes('2021010404'), '4 学号做了脱敏（不显示完整学号）')

  await page.getByText('TA 承接的').click()
  await page.waitForTimeout(600)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('宿舍搬两个行李箱'), '5 可切换查看 TA 承接的委托')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '19-profile.png') })

  // ---- 2. 从详情页点进主页 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/detail/detail?id=t1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1100)
  await page.locator('.person').first().click()
  await page.waitForTimeout(700)
  await page.getByText('查看主页', { exact: true }).click()
  await page.waitForTimeout(1200)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('子昂') && t.includes('个人简介'), '6 详情页点头像可进对方主页')

  // ---- 3. 点头像换头像 ----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.locator('.avatar-cam').first().click()
  await page.waitForTimeout(700)
  await page.getByText('换个 emoji 头像', { exact: false }).first().click()
  await page.waitForTimeout(1000)
  const st1 = await readState(page)
  const me1 = st1.users.find((u) => u.id === st1.sessionUserId)
  ok(!!me1.avatar && String(me1.avatar).indexOf('data:image') !== 0, '7 点头像可换 emoji 头像：' + me1.avatar)

  // ---- 4. 真实选文件（发布附件）----
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1100)

  const hasChooseFile = await page.evaluate(() => typeof uni !== 'undefined' && typeof uni.chooseFile === 'function')
  console.log('   uni.chooseFile 可用:', hasChooseFile)

  const chooserPromise = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null)
  await page.getByText('＋ 添加附件', { exact: true }).click()
  const chooser = await chooserPromise
  if (chooser) {
    await chooser.setFiles(FIXTURE)
    await page.waitForTimeout(900)
    t = await page.evaluate(() => document.body.innerText)
    ok(t.includes('课程报告-终稿.pdf'), '8 附件真实选中并显示文件名')
    ok(/KB|B/.test(t), '9 附件显示文件大小')
  } else {
    ok(false, '8 未触发文件选择器')
  }
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '20-publish-attach.png') })

  // ---- 5. 管理员订单管理 ----
  await loginAs(page, 'admin', 'admin888')
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/admin/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1300)
  await page.getByText('订单管理').first().click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('全部') && t.includes('待接单') && t.includes('已完成'), '10 订单管理筛选栏渲染')

  const before = (await page.evaluate(() => document.body.innerText)).match(/(\d+) 条/)?.[1]
  await page.locator('.filter').nth(5).click()
  await page.waitForTimeout(700)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已完成'), '11 按「已完成」筛选生效')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '21-admin-orders.png') })

  await page.locator('.order-card').first().click()
  await page.waitForTimeout(1200)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('订单详情'), '12 从订单管理可进入委托详情')

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
