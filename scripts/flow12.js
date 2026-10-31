// 验证锐评方案 P0：卡片主按钮 / 价格中性色 / 状态只出现一次 / 双列网格 / 已流单置灰
const { chromium } = require('playwright-core')
const BASE = 'http://127.0.0.1:5180'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ============ 桌面端：网格 + 卡片结构 ============
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

  // 1. 双列网格：前两张卡片同一行、宽度接近、x 不同
  const geo = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.tc')].slice(0, 4)
    return cards.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }
    })
  })
  ok(geo.length >= 2 && geo[0].y === geo[1].y, `1 前两张卡片同一行（y=${geo[0] && geo[0].y}）`)
  ok(geo[1] && geo[0].x !== geo[1].x, '2 左右两列（x 不同）')
  ok(geo[2] && geo[2].y > geo[0].y, '3 第三张换行到第二排')

  // 4. 每张可接的单都有唯一主按钮，文案「立即接单」
  const ctaTexts = await p.locator('.tc-cta-text').allInnerTexts()
  ok(ctaTexts.length > 0 && ctaTexts.every((x) => x === '立即接单'), `4 主按钮 ${ctaTexts.length} 个，文案统一「立即接单」`)

  // 5. 状态文字只出现一次（不再有「待接单」重复）
  const dup = await p.evaluate(() => {
    const card = document.querySelector('.tc')
    if (!card) return -1
    const txt = card.innerText
    return (txt.match(/待接单/g) || []).length
  })
  ok(dup === 1, `5 单卡内「待接单」只出现 ${dup} 次`)

  // 6. 价格是中性深色，不是橙/红
  const priceColor = await p.evaluate(() => {
    const el = document.querySelector('.tc-reward')
    return el ? getComputedStyle(el).color : ''
  })
  ok(priceColor === 'rgb(15, 23, 42)', '6 价格用中性深色 ' + priceColor)

  // 7. 左侧类型色条存在且宽 3px
  const bar = await p.evaluate(() => {
    const el = document.querySelector('.tc-bar')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), bg: getComputedStyle(el).backgroundColor }
  })
  ok(bar && bar.w >= 3, `7 左侧类型色条 ${bar && bar.w}px ${bar && bar.bg}`)

  // 8. 主按钮点击 → 进详情并自动走接单流程（押金不足会弹「缴纳押金」）
  await p.locator('.tc-cta').first().click()
  await p.waitForTimeout(2400)
  let t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('订单详情'), '8 点主按钮进入详情页')
  ok(t.includes('缴纳押金') && t.includes('还需补交'), '9 自动触发接单，押金不足弹出补交层')

  await p.screenshot({ path: 'preview/122-card-take.png' })

  // 9. 已流单：把某条任务截止时间改成过去，再看卡片
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.evaluate(() => {
    const read = (k) => {
      const raw = localStorage.getItem(k)
      const o = JSON.parse(raw)
      return o && o.data !== undefined ? o.data : o
    }
    const s = read('campus_commission_state_v2')
    const target = s.tasks.find((x) => x.status === 'pending' && x.audit === 'approved')
    if (target) target.deadline = Date.now() - 60 * 60 * 1000
    localStorage.setItem('campus_commission_state_v2', JSON.stringify({ type: 'object', data: s }))
    localStorage.setItem('campus_commission_stamp_v1', JSON.stringify({ type: 'number', data: Date.now() + 3 }))
  })
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/hall/hall`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('已流单'), '10 过期任务显示「已流单」')
  const dimmed = await p.locator('.tc-dim').count()
  ok(dimmed > 0, `11 过期任务置灰（${dimmed} 张）`)
  await p.screenshot({ path: 'preview/123-card-expired.png' })

  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
