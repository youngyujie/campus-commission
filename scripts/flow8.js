// 验证技能标签：现成可选 + 自定义 + 单个 ≤4 字 + 最多 8 个
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

const readMe = (page) =>
  page.evaluate(() => {
    const read = (k) => {
      const raw = localStorage.getItem(k)
      if (!raw) return null
      const p = JSON.parse(raw)
      return p && p.data !== undefined ? p.data : p
    }
    const s = read('campus_commission_state_v2')
    const me = s ? s.users.find((u) => u.id === s.sessionUserId) : null
    return me ? { nickname: me.nickname, skills: me.skills || [] } : null
  })

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message))

  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.getByText('林小满', { exact: false }).first().click()
  await page.waitForTimeout(2400)

  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.getByText('技能标签', { exact: true }).first().click()
  await page.waitForTimeout(900)

  const sheet = await page.evaluate(() => document.body.innerText)
  ok(sheet.includes('技能标签'), '1 编辑弹层出现「技能标签」')
  ok(sheet.includes('常用标签'), '2 出现「常用标签」区块')
  const presetCount = await page.locator('.tag').count()
  ok(presetCount >= 10, `3 现成标签已渲染（${presetCount} 个）`)
  ok(/\/8/.test(sheet), '4 显示已选数量 / 上限 8')

  // 原有标签应已选中（林小满种子有 3 个）
  const before = await readMe(page)
  ok(before.skills.length === 3, '5 原有技能标签读入：' + JSON.stringify(before.skills))

  // 点一个现成标签：跑腿
  await page.locator('.tag:not(.tag-on)').filter({ hasText: '跑腿' }).first().click({ force: true })
  await page.waitForTimeout(400)
  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('4/8'), '6 点现成标签后计数变 4/8')

  // 再点一次取消
  await page.locator('.tag:not(.tag-on)').filter({ hasText: '跑腿' }).first().click({ force: true })
  await page.waitForTimeout(400)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('3/8'), '7 再点一次取消，回到 3/8')

  // 自定义：输入超 4 字应被截断
  const custom = page.locator('.tag-custom input')
  await custom.fill('吹口琴表演')
  await page.waitForTimeout(300)
  const typed = await custom.inputValue()
  ok(typed.length <= 4, `8 自定义输入被截断到 ${typed.length} 字：${JSON.stringify(typed)}`)

  await custom.fill('吹口琴')
  await page.getByText('添加', { exact: true }).first().click()
  await page.waitForTimeout(500)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('4/8') && t.includes('吹口琴'), '9 自定义标签添加成功')

  // 重复添加应被拦
  await custom.fill('吹口琴')
  await page.getByText('添加', { exact: true }).first().click()
  await page.waitForTimeout(600)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('这个标签已经有了'), '10 重复标签被拦截')

  // 逐个点现成标签，直到 8 个
  const presets = page.locator('.tag-wrap').nth(1).locator('.tag')
  const total = await presets.count()
  const countOf = async () => {
    const txt = await page.evaluate(() => document.body.innerText)
    const m = txt.match(/(\d)\/8/)
    return m ? Number(m[1]) : 0
  }
  for (let i = 0; i < total; i++) {
    if ((await countOf()) >= 8) break
    await presets.nth(i).click({ force: true })
    await page.waitForTimeout(220)
  }
  let cur = await countOf()
  ok(cur === 8, `11 选满 8 个（当前 ${cur}/8）`)

  // 再点一个未选中的，应被拦住
  for (let i = 0; i < total; i++) {
    const cls = String(await presets.nth(i).getAttribute('class'))
    if (!cls.includes('tag-picked')) {
      await presets.nth(i).click({ force: true })
      break
    }
  }
  await page.waitForTimeout(700)
  t = await page.evaluate(() => document.body.innerText)
  const cur2 = await countOf()
  ok(t.includes('最多选 8 个标签') && cur2 === 8, `12 第 9 个被拦住（仍为 ${cur2}/8）`)

  // 保存
  await page.getByText('保存', { exact: true }).last().click()
  await page.waitForTimeout(1400)
  const after = await readMe(page)
  ok(after.skills.length === 8, '13 保存后技能标签数量 = ' + after.skills.length)
  ok(after.skills.every((s) => s.length <= 4), '14 全部标签都不超过 4 个字：' + JSON.stringify(after.skills))

  // 回到「我的」页面看展示
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('吹口琴'), '15 个人页展示新标签')
  await page.screenshot({ path: 'preview/60-tags.png' })

  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
