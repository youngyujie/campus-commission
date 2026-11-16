// 管理员「查看所有注册人员 + 管理账号」UI 验证（仅用演示账号，无真实凭证）
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:3103/'
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(page, text, tries = 15) {
  for (let i = 0; i < tries; i++) {
    await sleep(1000)
    if ((await page.evaluate(() => document.body.innerText)).includes(text)) return true
  }
  return false
}
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('.m-demo-item', { timeout: 30000 })
  await p.getByText('张老师', { exact: true }).first().click()
  ok(await waitFor(p, '委托大厅'), '管理员登录成功')

  await p.goto(BASE + '#/pages/admin/admin')
  await sleep(1500)
  ok((await p.evaluate(() => document.body.innerText)).includes('数据概览'), '进入管理后台')
  await p.getByText('用户管理', { exact: false }).first().click()
  await sleep(1600)

  const body = await p.evaluate(() => document.body.innerText)
  ok(body.includes('手机号'), '用户卡片展示手机号')
  ok(body.includes('学号'), '用户卡片展示学号')
  ok(body.includes('管理员'), '管理员账号也出现在列表')
  ok(body.includes('我'), '自己的账号有「我」标记')
  const cards = await p.locator('.user-card').count()
  console.log('user cards:', cards)
  ok(cards >= 5, '列出全部注册人员（含管理员）')

  // 筛选：只看管理员
  const adminFilter = p.locator('.u-filter').filter({ hasText: '管理员' })
  if (await adminFilter.count()) {
    await adminFilter.first().click()
    await sleep(500)
    const n = await p.locator('.user-card').count()
    console.log('admin-filtered cards:', n)
    ok(n >= 1 && n < cards, '「管理员」筛选生效')
    await p.locator('.u-filter').filter({ hasText: '全部' }).first().click()
    await sleep(400)
  }

  // 查看完整资料
  await p.getByText('查看资料', { exact: true }).first().click()
  await sleep(600)
  const modal = await p.evaluate(() => document.body.innerText)
  ok(modal.includes('学生认证') || modal.includes('信誉分'), '查看资料弹层展示完整信息')
  const closeBtn = p.getByText('关闭', { exact: true })
  if (await closeBtn.count()) await closeBtn.first().click()
  await sleep(400)

  // 管理操作：调整信誉分
  await p.locator('.u-manage-btn').first().click()
  await sleep(600)
  const sheet = await p.evaluate(() => document.body.innerText)
  ok(sheet.includes('调整信誉分') && sheet.includes('重置密码'), '管理菜单包含多个账号操作')
  // 两项写操作各用全新上下文，避免 H5 弹层遮罩残留
  const freshUsers = async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const q = await c.newPage()
    await q.goto(BASE, { waitUntil: 'domcontentloaded' })
    await q.waitForSelector('.m-demo-item', { timeout: 30000 })
    await q.getByText('张老师', { exact: true }).first().click()
    await waitFor(q, '委托大厅')
    await q.goto(BASE + '#/pages/admin/admin')
    await sleep(1300)
    await q.getByText('用户管理', { exact: false }).first().click()
    await sleep(1300)
    await q.locator('.u-manage-btn').first().click({ force: true })
    await sleep(600)
    await q.getByText('调整信誉分', { exact: true }).first().click({ force: true })
    await sleep(600)
    console.log('  modal inputs:', JSON.stringify(await q.evaluate(() => [...document.querySelectorAll('input, textarea')].map(i => ({ tag: i.tagName, cls: i.className, ph: i.placeholder, type: i.type })))))
    return q
  }

  // A) 空值提交必须被拦截，不能把信誉分清零
  const qa = await freshUsers()
  const confirmA = qa.getByText('确定', { exact: true })
  if (await confirmA.count()) await confirmA.first().click({ force: true })
  await sleep(1000)
  const emptyText = await qa.evaluate(() => document.body.innerText)
  console.log('  empty tail:', emptyText.replace(/\n+/g, ' | ').slice(-130))
  ok(!/已更新为 0/.test(emptyText), '空值不会把信誉分误清零')
  await qa.context().close()

  // B) 正确填入 88 应写入服务端
  const qb = await freshUsers()
  await qb.locator('textarea.uni-modal__textarea').fill('88')
  const confirmB = qb.getByText('确定', { exact: true })
  if (await confirmB.count()) await confirmB.first().click({ force: true })
  await sleep(1600)
  const after = await qb.evaluate(() => document.body.innerText)
  console.log('  after tail:', after.replace(/\n+/g, ' | ').slice(-160))
  ok(/信誉分已更新为 88/.test(after), '信誉分 88 已写入服务端')
  await qb.context().close()

  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
