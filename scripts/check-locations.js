const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(String(e)))
  await p.goto(FILE, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.getByText('林小满', { exact: true }).first().click()
  await p.waitForTimeout(1500)

  // 大厅卡片
  const hallText = await p.evaluate(() => [...document.querySelectorAll('.mcard')].map(x => x.innerText).join('\n'))
  console.log('--- hall cards ---\n' + hallText)
  ok(hallText.includes('第一学生食堂') || hallText.includes('教学楼') || hallText.includes('学生公寓'), '大厅卡片显示学校地点')
  ok(!/松园|竹园|梅园|兰园|一食堂|图书馆/.test(hallText), '大厅不再出现旧地名')

  // 发布页楼栋 chips + 模板
  await p.goto(FILE + '#/pages/publish/publish')
  await p.waitForTimeout(1000)
  const chips = await p.evaluate(() => [...document.querySelectorAll('.bd-text')].map(x => x.innerText))
  console.log('--- publish chips ---\n' + chips.join(' / '))
  ok(chips.includes('1号门') && chips.includes('1-6号公寓') && chips.includes('两江餐厅'), '发布页楼栋是学校地点')
  ok(!chips.includes('松园') && !chips.includes('图书馆'), '发布页不再有旧楼栋')

  // 我的资料：不应再有「头像」「历史头像」两行
  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(900)
  const labels = await p.evaluate(() => [...document.querySelectorAll('.info-row .info-label')].map(x => x.innerText))
  console.log('--- mine info labels ---\n' + labels.join(' / '))
  ok(!labels.includes('头像') && !labels.includes('历史头像'), '「我的资料」已移除头像/历史头像两行')

  // 点头像仍能弹出两项
  await p.locator('.avatar-hit').click()
  await p.waitForTimeout(600)
  const t = await p.evaluate(() => document.body.innerText)
  ok(t.includes('更改头像') && t.includes('历史头像'), '点头像仍可更换头像/查看历史头像')

  ok(errs.length === 0, '无 JS 报错' + (errs.length ? '：' + errs[0] : ''))
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
