// 验证后端同步：A 设备发布，B 设备能看到
const { chromium } = require('playwright-core')
const BASE = process.argv[2] || 'http://127.0.0.1:3100'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

async function login(page, name) {
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.getByText(name, { exact: false }).first().click()
  await page.waitForTimeout(2800)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ---------- A：林小满，发布一条委托 ----------
  const ctxA = await b.newContext({ viewport: { width: 390, height: 844 } })
  const A = await ctxA.newPage()
  const errA = []
  A.on('pageerror', (e) => errA.push(e.message))
  await A.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await A.evaluate(() => localStorage.clear())
  await A.goto('about:blank')
  await login(A, '林小满')

  let t = await A.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '1 A 设备登录成功')

  const title = '同步测试：帮忙取个快递到松园'
  await A.goto('about:blank')
  await A.goto(`${BASE}/#/pages/publish/publish`, { waitUntil: 'networkidle' })
  await A.waitForTimeout(2000)
  await A.getByText('学习辅导', { exact: true }).first().click()
  await A.waitForTimeout(400)
  await A.locator('.input-title input').fill(title)
  await A.locator('.textarea textarea').fill('这是一条用于验证跨设备同步的委托，A 设备发布，B 设备应该能看到。')
  await A.locator('.money-input input').first().fill('30')
  await A.locator('.input input').first().fill('松园 3 号楼')
  await A.waitForTimeout(400)
  await A.locator('.actionbar .btn').first().click()
  await A.waitForTimeout(3000)
  t = await A.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么') || t.includes('委托大厅'), '2 A 设备发布完成')
  await A.waitForTimeout(2000)

  // ---------- B：陈子昂，另一个浏览器上下文 ----------
  const ctxB = await b.newContext({ viewport: { width: 390, height: 844 } })
  const B = await ctxB.newPage()
  const errB = []
  B.on('pageerror', (e) => errB.push(e.message))
  await B.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await B.evaluate(() => localStorage.clear())
  await B.goto('about:blank')
  await login(B, '许一帆')

  let bt = await B.evaluate(() => document.body.innerText)
  ok(bt.includes('今天需要帮忙做点什么'), '3 B 设备用另一个账号登录成功（独立的 localStorage）')

  // 等一轮轮询
  let seen = false
  for (let i = 0; i < 6; i++) {
    await B.waitForTimeout(2000)
    bt = await B.evaluate(() => document.body.innerText)
    if (bt.includes(title)) {
      seen = true
      break
    }
  }
  ok(seen, '4 B 设备在大厅看到了 A 发布的委托')
  if (!seen) console.log('   B 页面片段:', bt.slice(0, 200).replace(/\n/g, ' '))

  await B.screenshot({ path: 'preview/160-sync-B-sees-A.png' })

  // ---------- 反向：B 注册的新账号，A 刷新后也能看到 ----------
  await B.evaluate(() => {
    const read = (k) => {
      const raw = localStorage.getItem(k)
      const o = JSON.parse(raw)
      return o && o.data !== undefined ? o.data : o
    }
    const s = read('campus_commission_state_v2')
    s.sessionUserId = ''
    localStorage.setItem('campus_commission_state_v2', JSON.stringify({ type: 'object', data: s }))
    localStorage.setItem('campus_commission_stamp_v1', JSON.stringify({ type: 'number', data: Date.now() + 1 }))
  })
  await B.goto('about:blank')
  await B.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await B.waitForTimeout(1800)
  await B.getByText('去注册', { exact: true }).click()
  await B.waitForTimeout(700)
  const inp = B.locator('.m-field input')
  await inp.nth(0).fill('同步新人')
  await inp.nth(1).fill('13900009999')
  await inp.nth(2).fill('')
  await inp.nth(3).fill('123456')
  await B.locator('.m-check').first().click()
  await B.waitForTimeout(200)
  await B.locator('.m-submit').click()
  await B.waitForTimeout(3000)

  // A 回到登录页看「本机已注册账号」——不该有新账号（本机≠本设备），
  // 但 A 的大厅数据里应该已经出现这个用户，用好友搜索验证
  await A.goto('about:blank')
  await A.goto(`${BASE}/#/pages/chat/chat`, { waitUntil: 'networkidle' })
  await A.waitForTimeout(2500)
  await A.getByText('好友', { exact: false }).first().click()
  await A.waitForTimeout(800)
  await A.locator('.search-input input').first().fill('13900009999')
  await A.locator('.search-btn').first().click()
  let found = false
  for (let i = 0; i < 5; i++) {
    await A.waitForTimeout(1800)
    const at = await A.evaluate(() => document.body.innerText)
    if (at.includes('同步新人') || at.includes('139****9999')) {
      found = true
      break
    }
  }
  ok(found, '5 A 设备按手机号搜到了 B 设备刚注册的账号')

  console.log('A 报错:', errA.length ? errA[0].slice(0, 120) : '无')
  console.log('B 报错:', errB.length ? errB[0].slice(0, 120) : '无')
  await b.close()
})()
