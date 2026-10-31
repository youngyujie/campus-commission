// 验证新规则：学号门槛、押金接单与返还、代取类商品价格/凭证、报酬上限、订单交流区、账号仓库
const { chromium } = require('playwright-core')
const path = require('path')

const BASE = 'http://127.0.0.1:5180'
const KEY = 'campus_commission_state_v2'
const VAULT = 'campus_commission_accounts_v1'
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
  await page.waitForTimeout(1600)

  // ===== 1. 未完成学生认证：只能浏览 =====
  await loginAs(page, '13800000006', '123456')
  await go(page, '/pages/detail/detail?id=t1')
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('请先完成学生认证'), '1 未认证时按钮提示「请先完成学生认证」')

  await page.getByText('请先完成学生认证', { exact: true }).click()
  await page.waitForTimeout(700)
  await page.getByText('去认证', { exact: true }).click()
  await page.waitForTimeout(1600)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('学生认证') && t.includes('身份证号'), '2 跳转到学生认证页')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '27-verify.png') })

  const vf = page.locator('.field .input input')
  await vf.nth(0).fill('2025010707')
  await vf.nth(1).fill('某某大学')
  await vf.nth(2).fill('许一帆')
  await vf.nth(3).fill('11010519491231002X')
  await page.locator('.submit').click()
  await page.waitForTimeout(1600)
  let s = await readState(page)
  const u6 = s.users.find((u) => u.name === '许一帆')
  ok(u6 && u6.studentId === '2025010707', '3 学号已随认证写入：' + (u6 && u6.studentId))
  ok(u6 && !!u6.verifiedAt, '3b 已记录认证时间')
  ok(u6 && u6.school === '某某大学' && u6.realName === '许一帆', '3c 学校与真实姓名已存')

  // ===== 2. 押金不足 → 补交 → 接单 =====
  await loginAs(page, '2024010303', '123456') // 苏晴 deposit 0
  await go(page, '/pages/detail/detail?id=t8') // 报酬 100 → 需押金 100
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('接取订单（押金 ¥100）'), '4 未缴押金时按钮显示所需押金')
  await page.getByText('接取订单（押金 ¥100）', { exact: true }).click()
  await page.waitForTimeout(800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('还需补交'), '5 弹出押金补交弹层')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '28-deposit.png') })

  await page.getByText('缴纳并接单', { exact: true }).click()
  await page.waitForTimeout(1400)
  s = await readState(page)
  const u3 = s.users.find((u) => u.name === '苏晴')
  const t8 = s.tasks.find((x) => x.id === 't8')
  ok(t8.status === 'assigned' && t8.assigneeId === u3.id, '6 押金缴纳后接单成功')
  ok(u3.deposit === 0 && t8.deposit === 100, `7 押金已冻结（余额 ${u3.deposit}，冻结 ${t8.deposit}）`)

  // ===== 3. 订单交流区 =====
  await page.locator('.dm-input input').fill('这个素材是横屏还是竖屏？')
  await page.getByText('发送', { exact: true }).click()
  await page.waitForTimeout(900)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('这个素材是横屏还是竖屏'), '8 订单交流区可发言')

  // ===== 4. 交付 → 验收 → 押金返还 =====
  await page.getByText('开始处理', { exact: true }).click()
  await page.waitForTimeout(900)
  await page.getByText('提交交付成果', { exact: true }).click()
  await page.waitForTimeout(700)
  await page.locator('.sheet input').nth(0).fill('招新短片-成片.mp4')
  await page.getByText('提交', { exact: true }).last().click()
  await page.waitForTimeout(1000)

  await loginAs(page, '2021010404', '123456') // 周野 = t8 委托人
  await go(page, '/pages/detail/detail?id=t8')
  await page.getByText('验收并确认完成', { exact: true }).click()
  await page.waitForTimeout(600)
  await page.getByText('确认完成', { exact: true }).last().click()
  await page.waitForTimeout(1300)
  s = await readState(page)
  const u3b = s.users.find((u) => u.name === '苏晴')
  const t8b = s.tasks.find((x) => x.id === 't8')
  ok(t8b.status === 'done', '9 订单已完成')
  ok(u3b.deposit === 100 && t8b.depositReturned, `10 押金已返还（余额 ${u3b.deposit}）`)

  // ===== 5. 发布校验：报酬上限 / 代取类必填 =====
  await loginAs(page, '2023010101', '123456')
  await go(page, '/pages/publish/publish')
  await page.getByText('代取代买', { exact: true }).click()
  await page.waitForTimeout(500)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('商品价格') && t.includes('上传凭证'), '11 选代取代买后出现商品价格与凭证')

  const pubInputs = page.locator('input')
  await pubInputs.nth(0).fill('帮买一杯咖啡送到松园')
  await page.locator('textarea').first().fill('一食堂楼下咖啡店，冰美式不加糖，送到楼下。')
  await pubInputs.nth(1).fill('20') // 商品价格
  await pubInputs.nth(2).fill('250') // 报酬超限
  await pubInputs.nth(3).fill('一食堂')
  await page.waitForTimeout(400)
  let btnClass = await page.locator('.actionbar .btn').first().getAttribute('class')
  ok(String(btnClass).includes('btn-disabled'), '12 报酬 250 元时无法提交（超上限）')

  await pubInputs.nth(2).fill('20')
  await page.waitForTimeout(400)
  btnClass = await page.locator('.actionbar .btn').first().getAttribute('class')
  ok(String(btnClass).includes('btn-disabled'), '13 代取类未上传凭证时无法提交')
  await page.screenshot({ path: path.join(__dirname, '..', 'preview', '29-publish-errand.png') })

  // ===== 6. 账号仓库：清业务数据后仍能登录 =====
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const vault = await page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    let v = JSON.parse(raw)
    if (v && v.data) v = v.data
    return { version: v.version, count: (v.accounts || []).length }
  }, VAULT)
  ok(vault && vault.count >= 7, `14 账号仓库独立存在（${vault ? vault.count : 0} 个账号，v${vault && vault.version}）`)

  await page.locator('input').nth(0).fill('13800000006')
  await page.locator('input').nth(1).fill('123456')
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(1800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '15 业务数据清空后，账号仍能登录')
  s = await readState(page)
  const back = s && s.users.find((u) => u.name === '许一帆')
  ok(back && back.studentId === '2025010707', '16 仓库里的学号也恢复了')

  await browser.close()
  console.log('\n运行时报错:', errors.length ? errors.join('\n') : '无')
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
