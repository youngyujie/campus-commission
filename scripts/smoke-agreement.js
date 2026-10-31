// 冒烟测试：登录/注册用户协议勾选强制（桌面 + 移动）
const { chromium } = require('playwright-core')
const path = require('path')

const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)

async function bodyHas(page, txt) {
  const t = await page.evaluate(() => document.body.innerText || '')
  return t.includes(txt)
}
async function waitToast(page, txt, ms = 2500) {
  try {
    await page.waitForFunction((t) => (document.body.innerText || '').includes(t), txt, { timeout: ms })
    return true
  } catch {
    return false
  }
}
const PHONE = 'input[type="number"]'
const PWD = 'input[type="password"]'
const NAME = 'input[type="text"]'
// 点提交按钮容器，避免文案差异；navigation 中断时 catch 忽略
const clickSubmit = (page, sel) => page.locator(sel).click({ timeout: 3000 }).catch(() => {})

async function loginFlow(page, submitSel) {
  await page.locator(PHONE).fill('13800000001')
  await page.locator(PWD).fill('123456')
  await clickSubmit(page, submitSel)
  const t = await waitToast(page, '请先勾选同意《用户协议》')
  ok(t, '登录未勾选 -> 弹出协议提示')
  await page.waitForTimeout(1800)
  await page.locator('.agree-row, .m-agree').first().click()
  await clickSubmit(page, submitSel)
  await page.waitForTimeout(1500)
  const t2 = await bodyHas(page, '请先勾选同意《用户协议》')
  ok(!t2, '登录已勾选 -> 不再弹协议提示')
}

async function registerFlow(page, submitSel) {
  await page.locator(NAME).fill('测试用户')
  await page.locator(PHONE).fill('13800000555')
  await page.locator(PWD).fill('123456')
  await clickSubmit(page, submitSel)
  const t = await waitToast(page, '请先勾选同意《用户协议》')
  ok(t, '注册未勾选 -> 弹出协议提示')
  await page.waitForTimeout(1800)
  await page.locator('.agree-row, .m-agree').first().click()
  await clickSubmit(page, submitSel)
  await page.waitForTimeout(1500)
  const t2 = await bodyHas(page, '请先勾选同意《用户协议》')
  ok(!t2, '注册已勾选 -> 不再弹协议提示')
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []

  // 桌面
  const d = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const dp = await d.newPage()
  dp.on('pageerror', (e) => errors.push('桌面:' + e))
  await dp.goto(FILE, { waitUntil: 'networkidle' })
  await dp.waitForTimeout(1200)
  ok(await bodyHas(dp, '我已阅读并同意'), '桌面：用户协议行已显示')
  await loginFlow(dp, '.submit')
  await dp.evaluate(() => localStorage.clear())
  await dp.goto(FILE, { waitUntil: 'networkidle' })
  await dp.waitForTimeout(1000)
  await dp.getByText('去注册', { exact: true }).click()
  await dp.waitForTimeout(400)
  await registerFlow(dp, '.submit')
  await d.close()

  // 移动
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const mp = await m.newPage()
  mp.on('pageerror', (e) => errors.push('移动:' + e))
  await mp.goto(FILE, { waitUntil: 'networkidle' })
  await mp.waitForTimeout(1200)
  ok(await mp.evaluate(() => !!document.querySelector('.m-agree')), '移动：用户协议行已显示')
  await loginFlow(mp, '.m-submit')
  await mp.evaluate(() => localStorage.clear())
  await mp.goto(FILE, { waitUntil: 'networkidle' })
  await mp.waitForTimeout(1000)
  await mp.getByText('去注册', { exact: true }).click()
  await mp.waitForTimeout(400)
  await registerFlow(mp, '.m-submit')
  await m.close()

  ok(errors.length === 0, '无页面 JS 报错' + (errors.length ? '：' + errors.join('|') : ''))
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
