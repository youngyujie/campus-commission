// 把 dist/build/h5 的 index.html + app.js + style.css 内联成单个 HTML
// 用法：UNI_SINGLE_FILE=1 uni build → node scripts/inline.js
// 注意：必须用「函数式替换」，否则 JS 代码里的 $& / $1 会被当成替换占位符而破坏产物
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist', 'build', 'h5')
const OUT = path.join(ROOT, '校园委托-单文件版.html')

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
const js = fs.readFileSync(path.join(DIST, 'assets', 'app.js'), 'utf8')
const css = fs.readFileSync(path.join(DIST, 'assets', 'style.css'), 'utf8')

// 去掉外链的 css / js 标签（用函数式替换，避免 $ 转义问题）
let out = html
  .replace(/<link[^>]*href="\.\/assets\/style\.css"[^>]*>/, () => '')
  .replace(/<script[^>]*src="\.\/assets\/app\.js"[^>]*>\s*<\/script>/, () => '')

if (/\.\/assets\//.test(out)) {
  console.error('✗ 未能移除外链标签，内联失败')
  process.exit(1)
}

// 把样式和脚本内联到 </head> 之前
const payload = `<style>\n${css}\n</style>\n<script type="module">\n${js}\n</script>\n</head>`
out = out.replace(/<\/head>/, () => payload)

fs.writeFileSync(OUT, out, 'utf8')
console.log('OK 已生成:', OUT)
console.log('   大小:', (Buffer.byteLength(out) / 1024).toFixed(0) + ' KB')
