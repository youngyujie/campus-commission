// 验证：学生认证流程 + 发单/接单门槛文案
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)
const VALID_ID = '11010519491231002X'

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  // ---------- 1. 注册一个新账号（没有认证） ----------
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  await p.getByText('去注册', { exact: true }).click()
  await p.waitForTimeout(900)
  const reg = p.locator('.m-field input, .field input')
  await reg.nth(0).fill('认证测试')
  await reg.nth(1).fill('13700001111')
  await reg.nth(2).fill('123456')
  const cb = p.locator('.m-check').first()
  if (await cb.count()) {
    const cls = String(await cb.getAttribute('class'))
    if (!cls.includes('m-check-on')) await cb.click()
  }
  await p.locator('.submit, .m-submit').click()
  await p.waitForTimeout(2400)
  let t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '1 注册后进入大厅')

  // ---------- 2. 我的：显示未认证 + 去认证入口 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('还未完成学生认证'), '2 我的页显示「还未完成学生认证」')
  ok(t.includes('去认证'), '3 提供「去认证」按钮')
  ok(t.includes('学生认证') && t.includes('未认证'), '4 资料列表有学生认证行，状态未认证')
  await p.screenshot({ path: 'preview/270-mine-unverified.png' })

  // ---------- 3. 发布被拦：文案是学生认证 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  await p.getByText('学习辅导', { exact: true }).first().click()
  await p.waitForTimeout(400)
  await p.locator('.input-title input').fill('认证前不该发出去的委托')
  await p.locator('.textarea textarea').fill('测试拦截')
  await p.locator('.money-input input').first().fill('20')
  await p.locator('.input input').first().fill('图书馆')
  await p.waitForTimeout(300)
  await p.locator('.actionbar .btn').first().click()
  await p.waitForTimeout(1200)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('请先完成学生认证'), '5 发布时提示「请先完成学生认证」')
  ok(t.includes('去认证'), '6 弹窗按钮是「去认证」')
  await p.screenshot({ path: 'preview/271-publish-blocked.png' })

  // ---------- 4. 点去认证 → 认证页 ----------
  await p.getByText('去认证', { exact: false }).last().click()
  await p.waitForTimeout(2000)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('学生认证') && t.includes('学号'), '7 进入学生认证页')
  const fields = await p.locator('.field .input input').count()
  ok(fields === 4, `8 认证表单 4 个字段（实际 ${fields}）`)
  await p.screenshot({ path: 'preview/272-verify-form.png' })

  // ---------- 5. 校验：身份证错误被拦 ----------
  const fi = p.locator('.field .input input')
  await fi.nth(0).fill('2025010999')
  await fi.nth(1).fill('某某大学')
  await fi.nth(2).fill('张小明')
  await fi.nth(3).fill('110105194912310021') // 最后一位故意写错
  await p.locator('.submit').click()
  await p.waitForTimeout(900)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('校验不通过') || t.includes('18 位'), '9 身份证校验失败被拦')

  // ---------- 6. 正确填写 → 认证通过 ----------
  await fi.nth(3).fill(VALID_ID)
  await p.locator('.submit').click()
  await p.waitForTimeout(1800)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('已完成学生认证'), '10 认证通过')
  ok(t.includes('2025010999') && t.includes('某某大学') && t.includes('张小明'), '11 认证信息回显')
  ok(t.includes('1101') && t.includes('002X'), '12 身份证号脱敏显示')
  await p.screenshot({ path: 'preview/273-verify-done.png' })

  // ---------- 7. 我的：状态变成已认证 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  t = await p.evaluate(() => document.body.innerText)
  ok(!t.includes('还未完成学生认证'), '13 认证后提醒条消失')
  ok(t.includes('已认证'), '14 资料列表显示「已认证」')

  // ---------- 8. 认证后能发单 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  await p.getByText('学习辅导', { exact: true }).first().click()
  await p.waitForTimeout(400)
  await p.locator('.input-title input').fill('认证之后发出来的委托')
  await p.locator('.textarea textarea').fill('认证通过后应该能发')
  await p.locator('.money-input input').first().fill('20')
  await p.locator('.input input').first().fill('图书馆')
  await p.waitForTimeout(300)
  await p.locator('.actionbar .btn').first().click()
  await p.waitForTimeout(3000)
  t = await p.evaluate(() => document.body.innerText)
  ok(!t.includes('请先完成学生认证'), '15 认证后不再被拦')

  console.log('运行时报错:', errs.length ? errs.slice(0, 2).join(' | ') : '无')
  await b.close()
})()
