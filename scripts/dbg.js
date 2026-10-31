// 定位 pageerror 来源：捕获未处理的 Promise 拒绝与所有 console 输出
const { chromium } = require('playwright-core')

const BASE = 'http://127.0.0.1:5180'

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  await ctx.addInitScript(() => {
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason
      let msg = ''
      try {
        msg = typeof r === 'string' ? r : JSON.stringify(r, Object.getOwnPropertyNames(r || {}))
      } catch (x) {
        msg = String(r)
      }
      console.log('__UNHANDLED__ ' + (r && r.message ? r.message : msg) + ' | ' + (r && r.stack ? r.stack.split('\n')[1] : ''))
    })
  })

  const page = await ctx.newPage()
  page.on('console', (m) => {
    const t = m.text()
    if (t.startsWith('__UNHANDLED__') || m.type() === 'error' || m.type() === 'warning') {
      console.log('[' + m.type() + '] ' + t.slice(0, 300))
    }
  })
  page.on('pageerror', (e) => {
    console.log('[pageerror] name=' + (e && e.name) + ' msg=' + (e && e.message))
    console.log('           stack=' + (e && e.stack ? String(e.stack).slice(0, 400) : 'none'))
  })

  const go = async (hash, wait = 1300) => {
    console.log('\n--- ' + hash + ' ---')
    await page.goto('about:blank')
    await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(wait)
  }

  await go('/pages/hall/hall', 1800)
  // 登录
  const inputs = page.locator('input')
  await inputs.nth(0).fill('2023010101')
  await inputs.nth(1).fill('123456')
  await page.locator('.submit, .m-submit').click()
  await page.waitForTimeout(1800)

  await go('/pages/hall/hall')
  await go('/pages/detail/detail?id=t1')
  await go('/pages/detail/detail?id=t4')
  await go('/pages/publish/publish')
  await go('/pages/orders/orders')
  await go('/pages/chat/chat')
  await go('/pages/room/room?taskId=t3&otherId=u5')
  await go('/pages/mine/mine')
  await go('/pages/rules/rules')

  await browser.close()
})().catch((e) => console.error('FAILED', e.message))
