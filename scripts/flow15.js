// 验证：访问口令 + 按人隔离 + 管理员全见 + 跨设备同步
const { chromium } = require('playwright-core')
const BASE = process.argv[2] || 'http://127.0.0.1:3300'
const KEY = process.argv[3] || 'testkey1'
const ok = (c, m) => console.log((c ? 'OK  ' : '✗   ') + m)

const withKey = (p) => `${BASE}/?key=${KEY}#${p}`

async function fresh(b, name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(withKey('/pages/login/login'), { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto('about:blank')
  await page.goto(withKey('/pages/login/login'), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  if (name) {
    await page.getByText(name, { exact: false }).first().click()
    await page.waitForTimeout(3200)
  }
  return { ctx, page, errs }
}

async function api(page, path, body) {
  return await page.evaluate(
    async (args) => {
      // uni 在页面里不是全局对象，直接读 localStorage 并解开 {type,data}
      const read = (k) => {
        const raw = localStorage.getItem(k)
        if (!raw) return ''
        try {
          const o = JSON.parse(raw)
          return o && o.data !== undefined ? o.data : o
        } catch (e) {
          return raw
        }
      }
      const headers = { 'x-cc-key': args.key }
      const t = read('cc_token_v1')
      if (t) headers['x-cc-token'] = t
      const opt = { headers }
      if (args.body) {
        opt.method = 'POST'
        opt.headers['Content-Type'] = 'application/json'
        opt.body = JSON.stringify(args.body)
      }
      const r = await fetch(args.base + args.path, opt)
      let j = null
      try {
        j = await r.json()
      } catch (e) {}
      return { status: r.status, body: j }
    },
    { base: BASE, key: KEY, path, body }
  )
}

;(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true })

  // ---------- 1. 口令门 ----------
  const c0 = await b.newContext({ viewport: { width: 390, height: 844 } })
  const P0 = await c0.newPage()
  await P0.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await P0.evaluate(() => localStorage.clear())
  await P0.goto('about:blank')
  await P0.goto(`${BASE}/#/pages/login/login`, { waitUntil: 'networkidle' })
  await P0.waitForTimeout(3000)
  let t = await P0.evaluate(() => document.body.innerText)
  ok(t.includes('需要访问口令'), '1 没带口令时弹出「需要访问口令」')

  await P0.locator('.keygate-input input').fill('wrongkey')
  await P0.locator('.keygate-btn').click()
  await P0.waitForTimeout(2500)
  t = await P0.evaluate(() => document.body.innerText)
  ok(t.includes('口令不对'), '2 口令错误时给出提示')

  await P0.locator('.keygate-input input').fill(KEY)
  await P0.locator('.keygate-btn').click()
  await P0.waitForTimeout(3000)
  t = await P0.evaluate(() => document.body.innerText)
  ok(!t.includes('需要访问口令') && t.includes('欢迎回来'), '3 口令正确后进入登录页')
  await c0.close()

  // ---------- 2. A 设备：林小满 ----------
  const A = await fresh(b, '林小满')
  t = await A.page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么'), '4 A（林小满）登录成功')

  const title = '隔离测试：帮我带份早饭到图书馆'
  await A.page.goto('about:blank')
  await A.page.goto(withKey('/pages/publish/publish'), { waitUntil: 'networkidle' })
  await A.page.waitForTimeout(2200)
  await A.page.getByText('学习辅导', { exact: true }).first().click()
  await A.page.waitForTimeout(400)
  await A.page.locator('.input-title input').fill(title)
  await A.page.locator('.textarea textarea').fill('验证按人隔离之后，别人还能不能在大厅看到这条。')
  await A.page.locator('.money-input input').first().fill('20')
  await A.page.locator('.input input').first().fill('图书馆一层')
  await A.page.waitForTimeout(400)
  await A.page.locator('.actionbar .btn').first().click()
  await A.page.waitForTimeout(3200)
  t = await A.page.evaluate(() => document.body.innerText)
  ok(t.includes('今天需要帮忙做点什么') || t.includes('委托大厅'), '5 A 发布成功')

  // ---------- 3. B 设备：许一帆 ----------
  const B = await fresh(b, '许一帆')
  let seen = false
  let bt = ''
  for (let i = 0; i < 6; i++) {
    await B.page.waitForTimeout(2000)
    bt = await B.page.evaluate(() => document.body.innerText)
    if (bt.includes(title)) {
      seen = true
      break
    }
  }
  ok(seen, '6 B 在大厅看到 A 的委托（大厅仍然共享）')
  if (!seen) console.log('   B 片段:', bt.slice(0, 160).replace(/\n/g, ' '))
  await B.page.screenshot({ path: 'preview/180-isolation-B.png' })

  // ---------- 4. 按人隔离：A 拿到的数据 ----------
  const aState = await api(A.page, '/api/state')
  const aUsers = (aState.body.data && aState.body.data.users) || []
  const aMe = aUsers.find((u) => u.username === '林小满' || u.name === '林小满')
  const aOthers = aUsers.filter((u) => u.id !== (aMe && aMe.id))
  ok(!!aMe && !!aMe.phone, '7 A 能看到自己的手机号')
  ok(aOthers.length > 0 && aOthers.every((u) => !u.phone), '8 A 看不到别人的手机号')
  ok(
    aOthers.length > 0 && aOthers.every((u) => !u.studentId && !u.password && u.deposit === undefined),
    `9 别人也没有学号/密码/余额（${aOthers.length} 人）`
  )

  const aMsg = (aState.body.data.messages || []).filter(
    (m) => m.fromId !== (aMe && aMe.id) && m.toId !== (aMe && aMe.id)
  )
  ok(aMsg.length === 0, '10 A 拿不到与自己无关的聊天记录')

  // ---------- 5. 按人隔离：B 拿到的数据 ----------
  const bState = await api(B.page, '/api/state')
  const bUsers = (bState.body.data && bState.body.data.users) || []
  const bMe = bUsers.find((u) => u.username === '许一帆' || u.name === '许一帆')
  const bMsg = (bState.body.data.messages || []).filter(
    (m) => m.fromId !== (bMe && bMe.id) && m.toId !== (bMe && bMe.id)
  )
  ok(bMsg.length === 0, '11 B 也只看得到自己的聊天')
  ok(
    bUsers.filter((u) => u.id !== (bMe && bMe.id)).every((u) => !u.phone),
    '12 B 看不到别人的手机号'
  )

  // ---------- 6. 没登录拿不到数据 ----------
  const noAuth = await api(A.page, '/api/state')
  const anon = await A.page.evaluate(async (args) => {
    const r = await fetch(args.base + '/api/state', { headers: { 'x-cc-key': args.key } })
    return r.status
  }, { base: BASE, key: KEY })
  ok(anon === 401, `13 没登录时拉数据被拒（${anon}）`)

  // ---------- 7. 管理员能看到全部 ----------
  const C = await fresh(b, '张老师')
  const cState = await api(C.page, '/api/state')
  const cData = cState.body.data || {}
  const cMsg = cData.messages || []
  const cUsers = cData.users || []
  ok(cMsg.length > 0, `14 管理员能看到全部聊天（${cMsg.length} 条）`)
  ok(cUsers.filter((u) => u.phone).length >= 2, '15 管理员能看到所有人的手机号')
  ok(cUsers.every((u) => !u.password), '16 连管理员也拿不到密码')

  // ---------- 8. 越权写入被拒（改别人）----------
  const victim = aOthers[0]
  await api(A.page, '/api/sync', {
    changes: {
      users: { upsert: [Object.assign({}, victim, { nickname: '被篡改' })], remove: [] }
    }
  })
  const after = await api(A.page, '/api/state')
  const v2 = ((after.body.data || {}).users || []).find((u) => u.id === victim.id)
  ok(!!v2 && v2.nickname !== '被篡改', `17 改不了别人的账号（${victim.id} 未被篡改）`)

  // ---------- 9. 伪造别人的委托也会被拒 ----------
  await api(A.page, '/api/sync', {
    changes: {
      tasks: {
        upsert: [
          {
            id: 'hack1',
            title: '伪造的委托',
            publisherId: victim.id,
            budget: 100,
            status: 'open',
            category: 'other',
            createdAt: Date.now()
          }
        ],
        remove: []
      }
    }
  })
  const after2 = await api(A.page, '/api/state')
  const hacked = ((after2.body.data || {}).tasks || []).find((t) => t.id === 'hack1')
  ok(!hacked, '18 伪造别人名义的委托被拦下')

  // ---------- 10. 重复注册被拒 ----------
  const dup = await api(B.page, '/api/register', {
    username: '另一个名字',
    phone: '13800000001',
    studentId: '',
    password: '123456'
  })
  ok(dup.body && dup.body.ok === false && /已经注册/.test(dup.body.msg || ''), `19 同手机号重复注册被拒：${dup.body && dup.body.msg}`)

  const dup2 = await api(B.page, '/api/register', {
    username: '许一帆',
    phone: '13911112222',
    studentId: '',
    password: '123456'
  })
  ok(dup2.body && dup2.body.ok === false, `20 同用户名重复注册被拒：${dup2.body && dup2.body.msg}`)

  // ---------- 11. 接单人能改任务（不然接单就坏了）----------
  const aTask = ((aState.body.data || {}).tasks || []).find(
    (t) => t.publisherId === (aMe && aMe.id) && !t.assigneeId
  )
  if (aTask) {
    await api(B.page, '/api/sync', {
      changes: {
        tasks: {
          upsert: [Object.assign({}, aTask, { assigneeId: bMe.id, status: 'taken' })],
          remove: []
        }
      }
    })
    const after3 = await api(B.page, '/api/state')
    const t3 = ((after3.body.data || {}).tasks || []).find((t) => t.id === aTask.id)
    ok(!!t3 && t3.assigneeId === bMe.id, '21 接单人能更新任务（接单不被误拦）')
  } else {
    ok(false, '21 没找到可接的任务，跳过')
  }

  // ---------- 12. 删不了别人的委托 ----------
  const otherTask = ((bState.body.data || {}).tasks || []).find(
    (t) => t.publisherId !== bMe.id && t.assigneeId !== bMe.id
  )
  if (otherTask) {
    await api(B.page, '/api/sync', { changes: { tasks: { upsert: [], remove: [otherTask.id] } } })
    const after4 = await api(B.page, '/api/state')
    const t4 = ((after4.body.data || {}).tasks || []).find((t) => t.id === otherTask.id)
    ok(!!t4, '22 删不掉别人的委托（数据不会被误清空）')
  } else {
    ok(false, '22 没找到别人的委托，跳过')
  }

  console.log('A 报错:', A.errs.length ? A.errs[0].slice(0, 120) : '无')
  console.log('B 报错:', B.errs.length ? B.errs[0].slice(0, 120) : '无')
  console.log('C 报错:', C.errs.length ? C.errs[0].slice(0, 120) : '无')
  await b.close()
})()
