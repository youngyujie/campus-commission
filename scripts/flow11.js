// 验证 Hero 改版：AI 一句话入口 / 意图胶囊 / 统计条 / 搜索仍可用
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1600)
  await p.getByText('林小满', { exact: false }).first().click()
  await p.waitForTimeout(2600)

  let t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '1 Hero 标题（已去掉 AI）')
  ok(!/\bAI\b/.test(t) && !t.includes('生成 →'), '2 页面上没有 AI 入口和「生成 →」按钮')
  ok(t.includes('今晚 8 点前把奶茶送到 3 号楼'), '3 意图胶囊渲染')
  ok(t.includes('搜索委托'), '4 搜索框（原 AI 输入框位置）')
  ok(!t.includes('有需要帮忙的事'), '4b 桌面端右上角卡片已移除')
  ok(t.includes('我发布的') && t.includes('我接取的') && t.includes('我完成的') && t.includes('我的评分'), '5 统计条四项')

  // 背景应为浅蓝 #EFF6FF，而不是高饱和蓝
  const bg = await p.evaluate(() => {
    const el = document.querySelector('.hero')
    return el ? getComputedStyle(el).backgroundColor : ''
  })
  ok(bg === 'rgb(239, 246, 255)', '6 Hero 浅蓝底 ' + bg)

  // 搜索仍然可用
  const ai = p.locator('.ai-input input').first()
  await ai.fill('奶茶')
  await p.waitForTimeout(900)
  const count1 = await p.locator('.tc').count()
  await ai.fill('')
  await p.waitForTimeout(900)
  const count2 = await p.locator('.tc').count()
  ok(count1 > 0 && count1 < count2, `7 输入即时筛选（奶茶 ${count1} 条 / 全部 ${count2} 条）`)

  // 点意图胶囊 → 带一句话到发布页
  await p.getByText('帮我从东门取两个快递', { exact: true }).first().click()
  await p.waitForTimeout(2200)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('发布订单'), '8 跳转到发布页')
  ok(t.includes('已根据你的一句话预填'), '9 显示预填提示')
  const title = await p.locator('.input-title input').inputValue()
  const desc = await p.locator('.textarea textarea').inputValue()
  ok(title.includes('东门取两个快递'), '10 标题已预填：' + title)
  ok(desc.includes('东门取两个快递'), '11 描述已预填')

  // 手输一句话再点「生成 →」
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  await p.locator('.ai-input input').first().fill('明天上午帮我把行李箱搬到兰园 2 号楼')
  await p.waitForTimeout(400)
  await p.locator('.ai-go').first().click()
  await p.waitForTimeout(2200)
  const title2 = await p.locator('.input-title input').inputValue()
  ok(title2.includes('行李箱'), '12 手输一句话也能预填：' + title2)

  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
