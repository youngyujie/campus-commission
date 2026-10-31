const { chromium } = require('playwright-core')
const path = require('path')
const FILE = 'file://' + path.resolve(__dirname, '../校园委托-单文件版.html')
const OUT = path.resolve(__dirname, '../preview')

async function loginDemo(page, name) {
  await page.goto(FILE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1300)
  await page.getByText(name, { exact: true }).first().click()
  await page.waitForTimeout(1600)
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const mp = await m.newPage()
  await loginDemo(mp, '林小满')
  const mInfo = await mp.evaluate(() => {
    const ind = document.querySelector('.tab-ind')
    const fab = document.querySelector('.tab-fab')
    return {
      tabInd: !!ind,
      tabIndTransform: ind ? getComputedStyle(ind).transform : null,
      tabIndTransition: ind ? getComputedStyle(ind).transition : null,
      tabFab: !!fab
    }
  })
  console.log('MOBILE', JSON.stringify(mInfo))
  await mp.screenshot({ path: OUT + '/hall-mobile.png' })
  await m.close()

  const d = await b.newContext({ viewport: { width: 1280, height: 860 } })
  const dp = await d.newPage()
  await loginDemo(dp, '林小满')
  const dInfo = await dp.evaluate(() => {
    const ind = document.querySelector('.sn-ind')
    const fab = document.querySelector('.tab-fab')
    const topPub = document.querySelector('.topbar-publish')
    return {
      snInd: !!ind,
      snIndTransform: ind ? getComputedStyle(ind).transform : null,
      snIndTransition: ind ? getComputedStyle(ind).transition : null,
      tabFab: !!fab,
      topbarPublish: !!topPub
    }
  })
  console.log('DESKTOP', JSON.stringify(dInfo))
  await dp.screenshot({ path: OUT + '/hall-desktop.png' })
  await d.close()

  await b.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
