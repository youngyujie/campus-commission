// 验证：服务端进程重启后，浏览器里已有的登录态仍然有效（无状态签名 token）
const { chromium } = require('playwright-core')
const { spawn } = require('child_process')
const path = require('path')

const PORT = 3107
const BASE = 'http://127.0.0.1:' + PORT + '/'
const SERVER = path.resolve(__dirname, '../server/server.js')
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function startServer() {
  const env = Object.assign({}, process.env, { ACCESS_KEY: 'off', PORT: String(PORT) })
  return spawn(process.execPath, [SERVER], { env, stdio: 'ignore' })
}
async function waitUp() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + 'api/ping')
      if (r.ok) return true
    } catch (e) { /* 还没起来 */ }
    await sleep(300)
  }
  return false
}
async function loginDemo(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.m-demo-item', { timeout: 30000 })
  await page.getByText('张老师', { exact: true }).first().click()
  for (let i = 0; i < 15; i++) {
    await sleep(1000)
    if ((await page.evaluate(() => document.body.innerText)).includes('委托大厅')) return true
  }
  return false
}
async function searchSelf(page) {
  await page.goto(BASE + '#/pages/chat/chat')
  await sleep(1200)
  await page.getByText('好友', { exact: false }).first().click()
  await sleep(500)
  await page.evaluate(() => {
    const el = document.querySelector('.search-input input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, '13800000000')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await sleep(250)
  await page.locator('.search-btn').click({ force: true })
  await sleep(1500)
  return page.evaluate(() => document.body.innerText)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  let proc = startServer()
  ok(await waitUp(), '第一轮服务启动')
  ok(await loginDemo(page), '第一轮登录成功')
  const t1 = await searchSelf(page)
  ok(t1.includes('自己'), '重启前搜索正常')

  // 模拟服务端重新部署 / 进程重启（data.json 保留）
  proc.kill()
  await sleep(700)
  proc = startServer()
  ok(await waitUp(), '服务进程已重启')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(2500)
  const afterReload = await page.evaluate(() => document.body.innerText)
  ok(!afterReload.includes('请先登录'), '重启后刷新页面不再要求重新登录')
  const t2 = await searchSelf(page)
  ok(t2.includes('自己') && !t2.includes('请先登录'), '重启后搜索仍正常（登录态保留）')

  proc.kill()
  await b.close()
})().catch((e) => { console.error('ERR', e); process.exit(1) })
