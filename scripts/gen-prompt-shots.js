// 把 docs/AI协作-Prompt快照.html 里的 4 段对话分别渲染成 PNG
const { chromium } = require('playwright-core')
const path = require('path')

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  const html = 'file://' + path.resolve(__dirname, '../docs/AI协作-Prompt快照.html')
  await p.goto(html, { waitUntil: 'load' })
  await p.waitForSelector('.chat-window', { timeout: 10000 })

  const files = ['01-配色.png', '02-导航.png', '03-大厅.png', '04-bug修复.png']
  const wins = p.locator('.chat-window')
  const n = await wins.count()
  console.log('chat-windows =', n)
  if (n !== files.length) throw new Error('段落数量与文件名不匹配')

  const outDir = path.resolve(__dirname, '../docs/screenshots')
  require('fs').mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < n; i++) {
    const el = wins.nth(i)
    const target = path.join(outDir, files[i])
    await el.screenshot({ path: target })
    const box = await el.boundingBox()
    console.log('saved', files[i], Math.round(box.width) + 'x' + Math.round(box.height))
  }
  await b.close()
})().catch(e => { console.error('ERR', e); process.exit(1) })
