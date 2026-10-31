// 头像全链路：选图 → 裁剪（拖动/缩放）→ 落库 → 历史头像
const { chromium } = require('playwright-core')
const path = require('path')
const BASE = 'http://127.0.0.1:5180'
const FIXTURE = path.join(__dirname, 'fixtures', '我的照片-大图.png')
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

const readMe = (page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('campus_commission_state_v2')
    if (!raw) return null
    const o = JSON.parse(raw)
    const s = o.data !== undefined ? o.data : o
    const me = s.users.find((u) => u.id === s.sessionUserId)
    return me
      ? { avatar: me.avatar || '', hist: Array.isArray(me.avatarHistory) ? me.avatarHistory.length : -1 }
      : null
  })

// 选图：直接用常驻 input 灌文件（不依赖系统对话框）
async function pickFile(page, file) {
  await page.locator('.avatar-cam').first().click()
  await page.waitForTimeout(800)
  await page.getByText('从文件选择', { exact: true }).first().click()
  await page.waitForTimeout(700)
  const input = page.locator('input[type=file]')
  if ((await input.count()) === 0) return false
  await input.last().setInputFiles(file)
  await page.waitForTimeout(2600)
  return true
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1600)
  const inp = p.locator('.m-field input, .field input')
  await inp.nth(0).fill('13800000001')
  await inp.nth(1).fill('123456')
  await p.locator('.submit, .m-submit').click()
  await p.waitForTimeout(2000)
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  // ---------- 1. 选图后必须弹裁剪框 ----------
  const picked = await pickFile(p, FIXTURE)
  ok(picked, '1 选到了文件')
  ok((await p.locator('.crop-mask').count()) === 1, '2 选完图直接弹出裁剪框（必经步骤）')

  // ---------- 2. 默认铺满 ----------
  const geo = await p.evaluate(() => {
    const v = document.querySelector('.crop-view')
    const i = document.querySelector('.crop-img')
    if (!v || !i) return null
    const vr = v.getBoundingClientRect()
    const ir = i.getBoundingClientRect()
    return { vw: Math.round(vr.width), iw: Math.round(ir.width), ih: Math.round(ir.height), vx: vr.x, vy: vr.y }
  })
  ok(!!geo && geo.iw >= geo.vw - 2 && geo.ih >= geo.vw - 2, `3 默认铺满（框 ${geo && geo.vw}，图 ${geo && geo.iw}×${geo && geo.ih}）`)
  await p.screenshot({ path: 'preview/261-crop-real.png' })

  // ---------- 3. 拖动 + 缩放 ----------
  const t0 = await p.evaluate(() => getComputedStyle(document.querySelector('.crop-img')).transform)
  await p.mouse.move(geo.vx + geo.vw / 2, geo.vy + geo.vw / 2)
  await p.mouse.down()
  await p.mouse.move(geo.vx + geo.vw / 2 - 40, geo.vy + geo.vw / 2 - 30, { steps: 10 })
  await p.mouse.up()
  await p.waitForTimeout(400)
  const t1 = await p.evaluate(() => getComputedStyle(document.querySelector('.crop-img')).transform)
  ok(t0 !== t1, '4 拖动改变位置')

  const w0 = await p.evaluate(() => Math.round(document.querySelector('.crop-img').getBoundingClientRect().width))
  // 滚轮放大
  await p.mouse.move(geo.vx + geo.vw / 2, geo.vy + geo.vw / 2)
  for (let i = 0; i < 4; i++) {
    await p.mouse.wheel(0, -120)
    await p.waitForTimeout(120)
  }
  const w1 = await p.evaluate(() => Math.round(document.querySelector('.crop-img').getBoundingClientRect().width))
  ok(w1 > w0, `5 滚轮放大（${w0} → ${w1}）`)

  // ---------- 4. 确定 → 落库 ----------
  await p.getByText('确定', { exact: true }).first().click()
  await p.waitForTimeout(1800)
  ok((await p.locator('.crop-mask').count()) === 0, '6 确定后裁剪框关闭')
  let me = await readMe(p)
  ok(!!me && me.avatar.indexOf('data:image') === 0, '7 头像已存成图片')
  ok(!!me && me.avatar.length < 200000, `8 体积 ${Math.round((me.avatar || '').length / 1024)} KB（上限 200 KB）`)
  ok(!!me && me.hist === 0, '9 第一次上传，历史还是空的（原头像是 emoji，不记录）')
  const firstAvatar = me.avatar

  // ---------- 5. 再传一次 → 上一张进历史 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await pickFile(p, FIXTURE)
  if ((await p.locator('.crop-mask').count()) === 1) {
    // 滚轮缩一点，保证裁出来和上一张不一样
    const geo2 = await p.evaluate(() => {
      const v = document.querySelector('.crop-view')
      const r = v.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    await p.mouse.move(geo2.x, geo2.y)
    for (let i = 0; i < 3; i++) {
      await p.mouse.wheel(0, 120)
      await p.waitForTimeout(120)
    }
    await p.getByText('确定', { exact: true }).first().click()
    await p.waitForTimeout(1800)
  }
  me = await readMe(p)
  ok(!!me && me.hist >= 1, `10 第二次上传后历史里有 ${me && me.hist} 张`)
  ok(!!me && me.avatar !== firstAvatar, '11 头像确实换成了新裁的那张')

  // ---------- 6. 从历史里选回第一张 ----------
  await p.goto('about:blank')
  await p.goto(`${BASE}/#/pages/mine/mine`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.getByText('历史头像', { exact: false }).first().click()
  await p.waitForTimeout(800)
  const items = await p.locator('.hist-item').count()
  ok(items >= 1, `12 历史面板有 ${items} 张`)
  await p.screenshot({ path: 'preview/262-history.png' })
  await p.locator('.hist-item').first().click()
  await p.waitForTimeout(1200)
  me = await readMe(p)
  ok(!!me && me.avatar.indexOf('data:image') === 0, '13 点历史头像直接换上')

  console.log('运行时报错:', errs.length ? errs.slice(0, 2).join(' | ') : '无')
  await b.close()
})()
