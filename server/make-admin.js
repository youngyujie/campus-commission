// 把某个账号设为管理员
// 用法：node make-admin.js <用户名|手机号|学号> [data.json 路径]
// 默认找 /opt/campus-commission/data.json，找不到就用同目录的 data.json
const fs = require('fs')
const path = require('path')

const who = String(process.argv[2] || '').trim()
if (!who) {
  console.log('用法：node make-admin.js <用户名|手机号|学号>')
  process.exit(1)
}

const candidates = [
  process.argv[3],
  '/opt/campus-commission/data.json',
  path.join(__dirname, 'data.json')
].filter(Boolean)

const file = candidates.find((f) => {
  try {
    return fs.existsSync(f)
  } catch (e) {
    return false
  }
})

if (!file) {
  console.log('找不到 data.json，请先启动过一次服务')
  process.exit(1)
}

const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
const data = raw && raw.data ? raw.data : raw
if (!data || !Array.isArray(data.users)) {
  console.log('data.json 里没有 users，格式不对')
  process.exit(1)
}

const k = who.toLowerCase()
const hit = data.users.find((u) =>
  [u.username, u.phone, u.studentId, u.nickname, u.name]
    .filter(Boolean)
    .some((v) => String(v).trim().toLowerCase() === k)
)

if (!hit) {
  console.log('没找到账号：' + who)
  console.log('现有账号：')
  data.users.forEach((u) => {
    console.log('  ' + (u.username || u.name || '-') + '  手机 ' + (u.phone || '-') + '  角色 ' + (u.role || 'user'))
  })
  process.exit(1)
}

hit.role = 'admin'
fs.writeFileSync(file, JSON.stringify(raw))
console.log('已设为管理员：' + (hit.username || hit.name) + '（' + (hit.phone || hit.id) + '）')
console.log('文件：' + file)
console.log('请重启服务：sudo systemctl restart campus')
