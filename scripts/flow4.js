// 验证：钱包流水、好友申请/同意、临时聊天 10 句限制、点头像弹层
const { chromium } = require('playwright-core')
const path = require('path')

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

async function go(page, hash, wait = 1200) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
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
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await loginAs(page, '2023010101', '123456')

  // ===== 1. 钱包 =====
  await go(page, '/pages/profile/profile?id=u1')
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('我的钱包'), '1 个人主页显示钱包')
  ok(t.includes('¥45'), '2 累计收入 ¥45（种子 t12 海报单）')
  ok(t.includes('社团招新海报设计'), '3 收入来源列出对应订单')
  ok(t.includes('接单收入'), '4 流水标注类型为「接单收入」')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '22-wallet.png') })

  // ===== 2. 好友申请（u2 已申请 u1）=====
  await go(page, '/pages/profile/profile?id=u2')
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('同意好友申请'), '5 对方已申请时按钮显示「同意好友申请」')
  await page.getByText('同意好友申请', { exact: true }).click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已是好友'), '6 同意后变为「已是好友」')

  let s = await readState(page)
  const fr = s.friends.find((f) => (f.aId === 'u1' && f.bId === 'u2') || (f.aId === 'u2' && f.bId === 'u1'))
  ok(fr && fr.status === 'accepted', '7 好友关系已写入 accepted')

  // ===== 3. 好友聊天不限次数 =====
  await page.getByText('发消息', { exact: true }).click()
  await page.waitForTimeout(1300)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('已是好友') && !t.includes('临时聊天中'), '8 好友聊天显示「已是好友·不限次数」')

  // ===== 4. 陌生人临时聊天 10 句 =====
  await go(page, '/pages/profile/profile?id=u3')
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('加好友'), '9 陌生人主页显示「加好友」')
  ok(t.includes('累计接单收入'), '10 他人主页显示累计收入')

  await page.getByText('发消息', { exact: true }).click()
  await page.waitForTimeout(1400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('临时聊天中'), '11 陌生人聊天顶部显示「临时聊天中」')
  ok(t.includes('还可发送 10 / 10 句'), '12 初始剩余 10 句')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '23-temp-chat.png') })

  // 发 3 句，检查剩余递减
  for (let i = 1; i <= 3; i++) {
    await page.locator('.inputbar input').fill('测试消息 ' + i)
    await page.getByText('发送', { exact: true }).click()
    await page.waitForTimeout(500)
  }
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('还可发送 7 / 10 句'), '13 发 3 句后剩余 7 句')

  // 再发 7 句，用尽
  for (let i = 4; i <= 10; i++) {
    await page.locator('.inputbar input').fill('测试消息 ' + i)
    await page.getByText('发送', { exact: true }).click()
    await page.waitForTimeout(450)
  }
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('临时聊天已结束'), '14 聊满 10 句后横幅变为「已结束」')
  ok(t.includes('添加好友后可继续聊天'), '15 输入区替换为加好友提示')
  const hasInput = await page.locator('.inputbar input').count()
  ok(hasInput === 0, '16 输入框已禁用（移除）')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '24-temp-limit.png') })

  // 数据层也拦截
  s = await readState(page)
  const cnt = s.messages.filter(
    (m) => (m.fromId === 'u1' && m.toId === 'u3') || (m.fromId === 'u3' && m.toId === 'u1')
  ).length
  ok(cnt === 10, '17 库中恰好 10 条消息（' + cnt + '）')

  // ===== 5. 好友列表 =====
  await go(page, '/pages/chat/chat')
  await page.getByText('好友').first().click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('我的好友（2）') && t.includes('子昂'), '18 好友列表显示已添加的好友')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '25-friends.png') })

  // ===== 6. 点头像弹层 =====
  await go(page, '/pages/detail/detail?id=t1')
  await page.locator('.person').first().click()
  await page.waitForTimeout(800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('查看主页') && t.includes('私聊') && t.includes('加好友'), '19 点头像弹出三个操作')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '26-avatar-sheet.png') })
  await page.getByText('查看主页', { exact: true }).click()
  await page.waitForTimeout(1200)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('个人简介'), '20 从弹层可进入对方主页')

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
