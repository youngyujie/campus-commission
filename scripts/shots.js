// 全站截图：逐页渲染并收集控制台错误
const { chromium } = require('playwright-core')
const path = require('path')

const BASE = 'http://127.0.0.1:5180'
const OUT = path.join(__dirname, '..', 'preview')

async function go(page, hash, wait = 1100) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
}

async function logout(page) {
  await go(page, '/pages/mine/mine')
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
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => {
    const detail = e && e.stack ? e.stack.split('\n').slice(0, 4).join(' << ') : String(e)
    errors.push('[pageerror] ' + detail)
  })
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push('[console] ' + m.text())
  })

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, name + '.png') })
    const t = await page.evaluate(() => document.body.innerText)
    console.log(name + ': ' + t.slice(0, 110).replace(/\n/g, ' | '))
  }

  // 干净起点
  await page.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await go(page, '/pages/hall/hall', 1600)
  await shot('01-login')

  // 林小满
  await loginAs(page, '2023010101', '123456')
  await go(page, '/pages/hall/hall')
  await shot('02-hall')
  await go(page, '/pages/detail/detail?id=t1')
  await shot('03-detail-pending')
  await go(page, '/pages/detail/detail?id=t4')
  await shot('04-detail-submitted')
  await go(page, '/pages/publish/publish')
  await shot('05-publish')
  await go(page, '/pages/orders/orders')
  await shot('06-orders')
  await go(page, '/pages/chat/chat')
  await shot('07-chat')
  await go(page, '/pages/room/room?taskId=t3&otherId=u5')
  await shot('08-room')
  await go(page, '/pages/mine/mine')
  await shot('09-mine')
  await go(page, '/pages/rules/rules')
  await shot('10-rules')

  // 周野（t8 的委托人）
  await loginAs(page, '2021010404', '123456')
  await go(page, '/pages/detail/detail?id=t8')
  await shot('11-detail-quotes')

  // 管理员
  await loginAs(page, 'admin', 'admin888')
  await go(page, '/pages/admin/admin', 1400)
  await shot('12-admin-home')
  await page.getByText('审核与下架').first().click()
  await page.waitForTimeout(900)
  await shot('13-admin-audit')
  await page.getByText('用户管理').first().click()
  await page.waitForTimeout(900)
  await shot('14-admin-users')
  await page.getByText('申诉处理').first().click()
  await page.waitForTimeout(900)
  await shot('15-admin-dispute')
  await page.getByText('分类管理').first().click()
  await page.waitForTimeout(900)
  await shot('16-admin-category')
  await page.getByText('公告发布').first().click()
  await page.waitForTimeout(900)
  await shot('17-admin-notice')

  await browser.close()
  console.log('\n错误 ' + errors.length + ' 条')
  if (errors.length) console.log(errors.join('\n'))
})().catch((e) => {
  console.error('FAILED', e.message)
  process.exit(1)
})
