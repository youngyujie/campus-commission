// 验证：注册页去掉学号 + 头像裁剪
const { chromium } = require('playwright-core')
const path = require('path')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)
const FIXTURE = path.join(__dirname, 'fixtures', '我的照片-大图.png')

async function loginAs(page, phone, pwd) {
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  const inp = page.locator('.m-field input, .field input')
  await inp.nth(0).fill(phone)
  await inp.nth(1).fill(pwd)
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(2200)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  // ---------- 1. 注册页只有 3 个字段 ----------
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  await p.getByText('去注册', { exact: true }).click()
  await p.waitForTimeout(900)

  const n = await p.locator('.m-field input, .field input').count()
  ok(n === 3, `1 注册表单只有 3 个输入框（实际 ${n}）`)

  const txt = await p.evaluate(() => document.body.innerText)
  ok(!txt.includes('学号'), '2 注册页不再出现「学号」字样')

  const phs = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.uni-input-placeholder')).map((e) => (e.innerText || '').trim())
  )
  ok(
    phs.length === 3 && (phs[0].includes('用户名') || phs[0].includes('昵称')) && phs[1].includes('手机号') && phs[2].includes('密码'),
    '3 三个框依次是 用户名 / 手机号 / 密码 → ' + JSON.stringify(phs)
  )
  await p.screenshot({ path: 'preview/220-register-3fields.png' })

  // 头像裁剪的完整链路见 scripts/flow18.js（选图→裁剪→落库→历史）

  console.log('运行时报错:', errs.length ? errs.slice(0, 2).join(' | ') : '无')
  await b.close()
})()
