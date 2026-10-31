import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// UNI_SINGLE_FILE=1 时关闭代码分割，把所有页面打进一个 chunk，
// 便于后续内联成「双击即开」的单文件 HTML（用于交付预览）。
const singleFile = process.env.UNI_SINGLE_FILE === '1'

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '127.0.0.1',
    port: 5180
  },
  build: singleFile
    ? {
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            entryFileNames: 'assets/app.js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name][extname]'
          }
        }
      }
    : {}
})
