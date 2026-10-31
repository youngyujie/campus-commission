// 一键产出「单文件版 HTML」：关闭代码分割构建 → 内联成单个文件
// 用法：node scripts/build-single.js（或 npm run build:single）
const { spawnSync } = require('child_process')
const path = require('path')

const bin = path.join(__dirname, '..', 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js')

const r = spawnSync(process.execPath, [bin, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, UNI_SINGLE_FILE: '1' }
})

if (r.status !== 0) {
  console.error('✗ 构建失败')
  process.exit(r.status || 1)
}

require('./inline.js')
