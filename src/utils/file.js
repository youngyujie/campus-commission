// 文件选择与图片转 base64 —— 统一封装，页面不直接碰平台差异

export function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

function isImageName(name) {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(name || ''))
}

function normalize(f) {
  const name = f.name || '未命名文件'
  return {
    name,
    size: f.size || 0,
    path: f.path || f.tempFilePath || '',
    isImage: isImageName(name)
  }
}


// ---------------- H5 选文件：常驻 input ----------------
// uni.chooseImage 会在异步回调里才去 input.click()，浏览器判定「非用户主动触发」会直接拦掉，
// 表现就是点了没反应。这里自己维护一个常驻隐藏 input，点击时同步触发，稳定得多。
// #ifdef H5
let h5Input = null

function ensureH5Input(accept, multiple) {
  if (!h5Input) {
    h5Input = document.createElement('input')
    h5Input.type = 'file'
    h5Input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0'
    document.body.appendChild(h5Input)
  }
  h5Input.setAttribute('accept', accept || '*/*')
  h5Input.multiple = !!multiple
  return h5Input
}

function pickViaInput(accept, multiple) {
  return new Promise((resolve) => {
    const input = ensureH5Input(accept, multiple)
    let settled = false

    const done = (val) => {
      if (settled) return
      settled = true
      input.removeEventListener('change', onChange)
      window.removeEventListener('focus', onFocus)
      resolve(val)
    }

    const onChange = () => {
      const files = Array.prototype.slice.call(input.files || [])
      if (!files.length) {
        done([])
        return
      }
      const mapped = files.map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size
      }))
      done(mapped)
    }

    // 用户点了取消：对话框关掉后窗口会重新拿到焦点，此时 files 还是空的
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || !input.files.length) done([])
      }, 700)
    }

    input.value = ''
    input.addEventListener('change', onChange)
    window.addEventListener('focus', onFocus)
    input.click()
  })
}
// #endif

// 选择文件（H5 走 uni.chooseFile，其它端回退到 chooseImage）
export function pickFiles({ count = 3 } = {}) {
  // #ifdef H5
  return pickViaInput('*/*', count > 1).then((list) =>
    list.map((x) => normalize({ name: x.name, size: x.size, path: x.url }))
  )
  // #endif
  // #ifndef H5
  return new Promise((resolve) => {
    if (typeof uni.chooseFile === 'function') {
      uni.chooseFile({
        count,
        success: (res) => {
          const list = (res.tempFiles || []).map(normalize)
          resolve(list)
        },
        fail: () => resolve([])
      })
      return
    }
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      success: (res) => {
        const paths = res.tempFilePaths || []
        const metas = res.tempFiles || []
        const list = paths.map((p, i) => normalize({ ...(metas[i] || {}), path: p, name: (metas[i] && metas[i].name) || `图片${i + 1}.jpg` }))
        resolve(list)
      },
      fail: () => resolve([])
    })
  })
  // #endif
}

// 选一张图片
export function pickImage() {
  // #ifdef H5
  return pickViaInput('image/*', false).then((list) => {
    if (!list.length) return null
    const x = list[0]
    return normalize({ name: x.name || '图片.jpg', size: x.size, path: x.url })
  })
  // #endif
  // #ifndef H5
  return new Promise((resolve) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        const p = (res.tempFilePaths || [])[0]
        const meta = (res.tempFiles || [])[0] || {}
        resolve(p ? normalize({ ...meta, path: p, name: meta.name || '图片.jpg' }) : null)
      },
      fail: () => resolve(null)
    })
  })
  // #endif
}

// 本地路径 → base64 dataURL（聊天图片用，刷新后不失效）
export function toDataUrl(path) {
  return new Promise((resolve) => {
    if (!path) {
      resolve('')
      return
    }
    // #ifdef H5
    fetch(path)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
      .catch(() => resolve(''))
    return
    // #endif
    // #ifndef H5
    try {
      uni.getFileSystemManager().readFile({
        filePath: path,
        encoding: 'base64',
        success: (r) => resolve('data:image/jpeg;base64,' + r.data),
        fail: () => resolve('')
      })
    } catch (e) {
      resolve('')
    }
    // #endif
  })
}

// 聊天图片体积上限（base64 后约 1.33 倍，localStorage 单域名约 5MB）
export const MAX_IMAGE_DATA_LEN = 260000

// 头像上限：压缩后一般 20–40 KB，留足余量
export const MAX_AVATAR_DATA_LEN = 200000

// 图片压缩成 dataURL —— 头像必须走这里，否则手机原图 base64 动辄几百 KB 会被上限挡住
export function compressImage(path, { max = 320, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    if (!path) {
      resolve('')
      return
    }
    // #ifdef H5
    try {
      const img = new Image()
      img.onload = () => {
        try {
          const iw = img.naturalWidth || img.width
          const ih = img.naturalHeight || img.height
          if (!iw || !ih) {
            resolve('')
            return
          }
          const scale = Math.min(1, max / Math.max(iw, ih))
          const w = Math.max(1, Math.round(iw * scale))
          const h = Math.max(1, Math.round(ih * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          // 透明 PNG 转 JPEG 会变黑底，先铺白
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (e) {
          resolve('')
        }
      }
      img.onerror = () => resolve('')
      img.src = path
      return
    } catch (e) {
      resolve('')
      return
    }
    // #endif
    // #ifndef H5
    toDataUrl(path).then(resolve)
    // #endif
  })
}

// 头像专用：压缩 + 兜底（压缩失败就退回原始 dataURL）
export async function toAvatarDataUrl(path) {
  const compressed = await compressImage(path, { max: 320, quality: 0.82 })
  if (compressed && compressed.length <= MAX_AVATAR_DATA_LEN) return compressed
  // 再压一次，更小
  const smaller = await compressImage(path, { max: 200, quality: 0.7 })
  if (smaller && smaller.length <= MAX_AVATAR_DATA_LEN) return smaller
  if (compressed) return compressed
  return await toDataUrl(path)
}
