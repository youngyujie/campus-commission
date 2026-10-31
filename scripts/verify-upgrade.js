const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)

async function freshLogin(page, name) {
  await page.goto(FILE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.getByText(name, { exact: true }).first().click()
  await page.waitForTimeout(1400)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))

  // ---------- 1. 大厅：真实头像 + 搜索框进入独立搜索页 ----------
  await freshLogin(p, '林小满')
  await p.waitForTimeout(500)
  const avCount = await p.locator('.topbar-avatar .av').count()
  ok(avCount > 0, '大厅右上角使用头像组件（非字母）')
  const noIntent = (await p.locator('.intent').count()) === 0
  ok(noIntent, '搜索框下已无默认选项胶囊')

  await p.locator('.ai-search').click()
  await p.waitForTimeout(700)
  ok(p.url().includes('pages/search/search'), '点击搜索框进入独立搜索页')
  await p.locator('.sbar-input input').fill('奶茶')
  await p.locator('.sbar-btn').click()
  await p.waitForTimeout(600)
  const rc = await p.locator('.rcard').count()
  ok(rc >= 0 && (await p.locator('.result-count').count()) > 0, '搜索页可搜索并显示结果计数')

  // ---------- 2. 发布页：标题在第一位 + 违规拦截 + 整改通知 ----------
  await p.goto(FILE + '#/pages/publish/publish')
  await p.waitForTimeout(1000)
  const firstCardIsTitle = await p.evaluate(() => {
    const cards = document.querySelectorAll('.body .card')
    return cards.length ? cards[0].classList.contains('card-title') : false
  })
  ok(firstCardIsTitle, '发布页第一张卡就是「委托标题」')

  // 填表（选「文档制作」避免商品价格卡）
  await p.locator('.input-title input').fill('帮我代考高数期末考试')
  await p.locator('.cat').nth(1).click()
  await p.locator('.textarea textarea').fill('这是一段超过十个字的委托描述内容，用于测试违规拦截')
  await p.locator('.money-input input').first().fill('10')
  await p.locator('.input input').first().fill('图书馆三楼')
  await p.waitForTimeout(300)
  await p.locator('.submit-inline .btn').click()
  await p.waitForTimeout(900)
  const bodyAfterPublish = await p.evaluate(() => document.body.innerText)
  ok(/发布被拦截|违规词/.test(bodyAfterPublish), '违规内容发布被系统拦截')

  // 关掉弹窗
  const goFix = p.getByText('去整改', { exact: true })
  if (await goFix.count()) await goFix.click()
  await p.waitForTimeout(500)

  // 查看通知：消息 → 通知
  await p.goto(FILE + '#/pages/chat/chat')
  await p.waitForTimeout(1000)
  await p.getByText('通知', { exact: false }).first().click()
  await p.waitForTimeout(600)
  const noticeText = await p.evaluate(() => document.body.innerText)
  ok(noticeText.includes('整改'), '发布失败后收到「整改」通知')

  // ---------- 3. 称号：我的 → 点称号 → 详情页 ----------
  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(1000)
  await p.locator('.p-title').click()
  await p.waitForTimeout(800)
  const titleText = await p.evaluate(() => document.body.innerText)
  ok(p.url().includes('pages/title/title'), '点击称号进入称号详情页')
  ok(titleText.includes('校园之初') && titleText.includes('获取途径'), '称号详情页显示称号与获取途径')

  // ---------- 4. 好友搜索卡片 → 主页固定按钮 ----------
  await p.goto(FILE + '#/pages/chat/chat')
  await p.waitForTimeout(1000)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(500)
  await p.locator('.search-input input').fill('13800000002')
  await p.locator('.search-btn').click()
  await p.waitForTimeout(700)
  const ucards = await p.locator('.ucard').count()
  ok(ucards >= 1, '按手机号搜索弹出用户卡片')
  const cardText = await p.locator('.ucard').first().innerText()
  console.log('   [card] ' + cardText.replace(/\n/g, ' / '))
  ok(cardText.includes('子昂') && /校园/.test(cardText), '卡片含头像/名字/称号')
  await p.locator('.ucard').first().click()
  await p.waitForTimeout(900)
  ok(p.url().includes('pages/profile/profile'), '点击卡片进入对方主页')
  const hasBar = await p.locator('.bottom-bar').count()
  ok(hasBar > 0, '对方主页底部有固定的加好友/开始聊天按钮')
  const barText = await p.locator('.bottom-bar').first().innerText()
  ok(barText.includes('开始聊天'), '底部按钮含「开始聊天」')

  // 搜自己：卡片出现，但主页无底部按钮
  await p.goto(FILE + '#/pages/chat/chat')
  await p.waitForTimeout(900)
  await p.getByText('好友', { exact: false }).first().click()
  await p.waitForTimeout(400)
  await p.locator('.search-input input').fill('13800000001')
  await p.locator('.search-btn').click()
  await p.waitForTimeout(600)
  ok((await p.locator('.ucard').count()) >= 1, '搜自己的手机号也弹出卡片')
  await p.locator('.ucard').first().click()
  await p.waitForTimeout(800)
  ok((await p.locator('.bottom-bar').count()) === 0, '自己主页不显示加好友/开始聊天按钮')

  // ---------- 5. 头像：点头像弹选项；历史头像独立页 ----------
  await p.goto(FILE + '#/pages/mine/mine')
  await p.waitForTimeout(900)
  await p.locator('.avatar-hit').click()
  await p.waitForTimeout(700)
  const sheetText = await p.evaluate(() => document.body.innerText)
  ok(sheetText.includes('更改头像') && sheetText.includes('历史头像'), '点头像弹出「更改头像 / 历史头像」')
  // 点历史头像进入独立页
  await p.getByText('历史头像', { exact: true }).last().click()
  await p.waitForTimeout(900)
  ok(p.url().includes('pages/avatars/avatars'), '进入历史头像独立界面')

  // ---------- 6. 学生认证：已认证用户锁定，无表单 ----------
  await p.goto(FILE + '#/pages/verify/verify')
  await p.waitForTimeout(900)
  const vText = await p.evaluate(() => document.body.innerText)
  ok(vText.includes('已完成学生认证'), '完整认证用户显示「已完成学生认证」')
  ok(vText.includes('申请修改认证') && !vText.includes('填写认证信息'), '认证后锁定，只能申请修改')

  // ---------- 7. 无 JS 报错 ----------
  ok(errs.length === 0, '无页面 JS 报错' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''))

  await b.close()
})().catch((e) => {
  console.error('TEST ERROR', e)
  process.exit(1)
})
