// 验证：点头像换头像（含大图压缩）+ 点一行改一项
const { chromium } = require('playwright-core')
const path = require('path')
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
    return me
      ? {
          nickname: me.nickname,
          college: me.college,
          bio: me.bio,
          skills: me.skills || [],
          avatar: me.avatar || ''
        }
      : null
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

  let t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('我的资料') && t.includes('点一行改一项'), '1 「我的资料」卡片渲染')
  ok(!t.includes('编辑资料'), '2 不再占用空间的「编辑资料」入口已移除')

  // ---- 点头像 → 出现四个选项 ----
  await page.locator('.avatar-cam').first().click()
  await page.waitForTimeout(700)
  t = await page.evaluate(() => document.body.innerText)
  ok(
    t.includes('从相册选择') && t.includes('从文件选择') && t.includes('emoji'),
    '3 点头像弹出更换选项'
  )

  // ---- 从文件选择：上传 1.8 MB 大图 → 裁剪 → 落库 ----
  const before = await readMe(page)
  await page.getByText('从文件选择', { exact: true }).first().click()
  await page.waitForTimeout(800)
  const fileInput = page.locator('input[type=file]')
  if ((await fileInput.count()) > 0) {
    await fileInput.last().setInputFiles(path.join(__dirname, 'fixtures', '我的照片-大图.png'))
    await page.waitForTimeout(2600)
  }

  let cropped = false
  if ((await page.locator('.crop-mask').count()) === 1) {
    cropped = true
    await page.screenshot({ path: 'preview/230-flow9-crop.png' })
    await page.getByText('确定', { exact: true }).first().click()
    await page.waitForTimeout(1800)
  }

  ok(cropped, '4 选完图弹出裁剪框')
  if (cropped) {
    const after = await readMe(page)
    const isImg = String(after.avatar).indexOf('data:image') === 0
    ok(isImg, '5 裁剪后头像变成图片（data:image…）')
    ok(after.avatar.length < 200000, `6 裁剪后 ${Math.round(after.avatar.length / 1024)} KB，未超上限`)
    ok(before.avatar !== after.avatar, '7 头像确实被替换')
  }

  // ---- 点「昵称」改昵称 ----
  await page.getByText('昵称', { exact: true }).first().click()
  await page.waitForTimeout(800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('改昵称'), '7 点昵称弹出单项编辑')
  const nickInput = page.locator('.sheet.pop input').first()
  await nickInput.fill('小满同学')
  await page.getByText('保存', { exact: true }).last().click()
  await page.waitForTimeout(1200)
  const after2 = await readMe(page)
  ok(after2.nickname === '小满同学', '8 昵称已保存：' + after2.nickname)

  // ---- 点「院系」 ----
  await page.getByText('院系', { exact: true }).first().click()
  await page.waitForTimeout(800)
  await page.locator('.sheet.pop input').first().fill('视觉传达 · 大三')
  await page.getByText('保存', { exact: true }).last().click()
  await page.waitForTimeout(1200)
  const after3 = await readMe(page)
  ok(after3.college === '视觉传达 · 大三', '9 院系已保存：' + after3.college)

  // ---- 点「个人简介」 ----
  await page.getByText('个人简介', { exact: true }).first().click()
  await page.waitForTimeout(800)
  await page.locator('.sheet.pop textarea').first().fill('PPT、海报、拍照都能做，接单准时。')
  await page.getByText('保存', { exact: true }).last().click()
  await page.waitForTimeout(1200)
  const after4 = await readMe(page)
  ok(after4.bio.includes('PPT'), '10 简介已保存')

  // ---- 点「技能标签」 ----
  await page.getByText('技能标签', { exact: true }).first().click()
  await page.waitForTimeout(800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('常用标签') && t.includes('自定义'), '11 点技能标签弹出标签选择器')
  const preset = page.locator('.tag-wrap').nth(1).locator('.tag').filter({ hasText: '视频剪辑' }).first()
  if (await preset.count()) {
    await preset.click({ force: true })
    await page.waitForTimeout(400)
  }
  await page.getByText('保存', { exact: true }).last().click()
  await page.waitForTimeout(1200)
  const after5 = await readMe(page)
  ok(after5.skills.indexOf('视频剪辑') >= 0, '12 技能标签已保存：' + JSON.stringify(after5.skills))

  // ---- 点「学号」（已绑定，应提示） ----
  await page.getByText('学号', { exact: true }).first().click()
  await page.waitForTimeout(800)
  t = await page.evaluate(() => document.body.innerText)
  ok(t.includes('学号已绑定'), '13 已绑定学号时点击给出提示')

  await page.waitForTimeout(600)
  await page.screenshot({ path: 'preview/70-mine-rows.png' })
  console.log('运行时报错:', errs.length ? errs.slice(0, 3).join(' | ') : '无')
  await b.close()
})()
