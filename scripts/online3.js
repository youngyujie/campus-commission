// 线上验收：确认最新版真的生效
const { chromium } = require('playwright-core')
const URL = 'https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ---------- 桌面端 ----------
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const derr = []
  d.on('pageerror', (e) => derr.push(e.message))
  const t0 = Date.now()
  await d.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await d.waitForTimeout(3500)
  console.log('首屏:', Date.now() - t0, 'ms')
  await d.getByText('林小满', { exact: false }).first().click()
  await d.waitForTimeout(3200)

  const m = await d.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), w: Math.round(r.width) }
    }
    return {
      side: !!document.querySelector('.sidenav'),
      tab: !!document.querySelector('.tabbar-wrap'),
      hero: g('.hero'),
      card: g('.tc'),
      cards: document.querySelectorAll('.tc').length,
      cta: document.querySelectorAll('.tc-cta').length,
      filter: !!document.querySelector('.filter-wrap'),
      seg: !!document.querySelector('.seg'),
      oldCats: !!document.querySelector('.cats')
    }
  })
  ok(m.side && !m.tab, '1 桌面端左侧导航（无底部栏）')
  ok(m.hero && m.hero.w >= 1100, `2 内容铺满（hero 宽 ${m.hero && m.hero.w}）`)
  ok(m.filter && m.seg && !m.oldCats, '3 筛选压成一行（分类 chip + 分段排序）')
  ok(m.cards >= 8, `4 任务卡 ${m.cards} 张`)
  ok(m.card && m.card.w < 700, `5 双列卡片（单卡 ${m.card && m.card.w}）`)
  ok(m.cta > 0, `6 卡片主按钮 ${m.cta} 个`)
  await d.screenshot({ path: 'preview/140-online-desktop.png' })
  await d.close()

  // ---------- 手机端 ----------
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const perr = []
  p.on('pageerror', (e) => perr.push(e.message))
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(3000)
  await p.getByText('林小满', { exact: false }).first().click()
  await p.waitForTimeout(3200)
  const mm = await p.evaluate(() => ({
    side: !!document.querySelector('.sidenav'),
    tab: !!document.querySelector('.tabbar-wrap'),
    cards: document.querySelectorAll('.tc').length,
    ai: !!document.querySelector('.ai-search')
  }))
  ok(!mm.side && mm.tab, '7 手机端仍是底部导航')
  ok(mm.ai, '8 手机端 AI 输入框')
  ok(mm.cards >= 8, `9 手机端单列卡片 ${mm.cards} 张`)
  await p.screenshot({ path: 'preview/141-online-mobile.png' })

  console.log('桌面报错:', derr.length ? derr[0].slice(0, 120) : '无')
  console.log('手机报错:', perr.length ? perr[0].slice(0, 120) : '无')
  await b.close()
})()
