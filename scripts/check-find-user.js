const BASE = 'http://127.0.0.1:3104'
const post = async (path, body, token) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'x-cc-token': token } : {}),
    body: JSON.stringify(body)
  })
  return r.json()
}
const ok = (c, m) => console.log((c ? 'OK ' : 'XX ') + m)
;(async () => {
  // 注册：管理员（所有者手机号）+ 一个普通账号
  const a = await post('/api/register', { username: '管理员甲', phone: '17381081281', password: '123456' })
  console.log('register owner role:', (a.user || {}).role)
  const b = await post('/api/register', { username: '同学乙', phone: '13800000001', password: '123456' })
  console.log('register normal:', b.ok)

  const login = await post('/api/login', { account: '17381081281', password: '123456' })
  const token = login.token
  console.log('token format:', token ? token.split('.').length + ' parts' : 'none')
  ok(!!token, '管理员登录拿到 token')

  for (const p of ['17381081281', '13800000001', '13800000009']) {
    const r = await post('/api/find-user', { phone: p }, token)
    console.log(`  find ${p}: ok=${r.ok} role=${r.ok ? 'found' : ''} isMe=${r.ok ? r.list[0].isMe : '-'} msg=${r.msg || ''}`)
  }
  const self = await post('/api/find-user', { phone: '17381081281' }, token)
  ok(self.ok && self.list[0].isMe === true, '管理员能搜到自己（isMe=true）')
  const other = await post('/api/find-user', { phone: '13800000001' }, token)
  ok(other.ok, '其他已注册账号能搜到')
  const none = await post('/api/find-user', { phone: '13800000009' }, token)
  ok(!none.ok, '真正未注册的手机号仍提示未找到')

  // 把 token 存下来，供重启后验证
  require('fs').writeFileSync(require('path').resolve(__dirname, '.tmp-token'), token)
  console.log('TOKEN_SAVED')
})().catch(e => { console.error('ERR', e); process.exit(1) })
