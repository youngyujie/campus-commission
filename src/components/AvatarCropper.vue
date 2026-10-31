<template>
  <view v-if="visible" class="crop-mask" @tap="onCancel">
    <view class="crop-panel" @tap.stop>
      <text class="crop-title">调整头像</text>
      <text class="crop-sub">拖动移动位置 · 双指捏合或滚轮缩放</text>

      <view
        class="crop-view"
        :style="{ width: view + 'px', height: view + 'px' }"
        @touchstart="onStart"
        @touchmove.stop.prevent="onMove"
        @touchend="onEnd"
        @touchcancel="onEnd"
        @mousedown="onStart"
        @mousemove="onMove"
        @mouseup="onEnd"
        @mouseleave="onEnd"
      >
        <image v-if="src" class="crop-img" :src="src" :style="imgStyle" mode="scaleToFill" />
        <view class="crop-grid"></view>
        <view class="crop-ring"></view>
      </view>

      <view class="crop-actions">
        <view class="crop-btn crop-btn-ghost" @tap="onCancel">
          <text class="crop-btn-text-ghost">取消</text>
        </view>
        <view class="crop-btn crop-btn-primary" @tap="onConfirm">
          <text class="crop-btn-text">确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AvatarCropper',
  props: {
    visible: { type: Boolean, default: false },
    src: { type: String, default: '' }
  },
  data() {
    return {
      view: 280,
      imgW: 0,
      imgH: 0,
      baseScale: 1,
      scale: 1,
      tx: 0,
      ty: 0,
      dragging: false,
      pinching: false,
      startX: 0,
      startY: 0,
      startTx: 0,
      startTy: 0,
      pinchDist: 0,
      pinchScale: 1,
      pinchMidX: 0,
      pinchMidY: 0
    }
  },
  computed: {
    imgStyle() {
      if (!this.imgW) return 'display:none'
      const w = this.imgW * this.scale
      const h = this.imgH * this.scale
      return (
        'width:' + w + 'px;height:' + h + 'px;' +
        'transform:translate3d(' + this.tx + 'px,' + this.ty + 'px,0);'
      )
    }
  },
  watch: {
    src() {
      this.loadImage()
    },
    visible(v) {
      if (v) {
        this.loadImage()
        this.$nextTick(() => this.bindWheel())
      } else {
        this.unbindWheel()
      }
    }
  },
  mounted() {
    try {
      const info = uni.getSystemInfoSync()
      const w = info.windowWidth || 375
      this.view = Math.min(280, Math.round(w * 0.72))
    } catch (e) {
      this.view = 260
    }
    if (this.visible) {
      this.loadImage()
      this.$nextTick(() => this.bindWheel())
    }
  },
  beforeUnmount() {
    this.unbindWheel()
  },
  methods: {
    // ---------- 元素与几何 ----------
    viewEl() {
      try {
        if (this.$el && this.$el.querySelector) return this.$el.querySelector('.crop-view')
      } catch (e) {
        /* 忽略 */
      }
      return null
    },
    cacheRect() {
      const el = this.viewEl()
      this._rect = el ? el.getBoundingClientRect() : null
    },
    // 客户端坐标 → 裁剪框内坐标
    toLocal(clientX, clientY) {
      if (!this._rect) this.cacheRect()
      const r = this._rect
      if (!r) return { x: this.view / 2, y: this.view / 2 }
      return { x: clientX - r.left, y: clientY - r.top }
    },

    // ---------- 载入图片 ----------
    loadImage() {
      if (!this.src) return
      const img = new Image()
      img.onload = () => {
        const iw = img.naturalWidth || img.width
        const ih = img.naturalHeight || img.height
        if (!iw || !ih) return
        this._img = img
        this.imgW = iw
        this.imgH = ih
        // cover：短边铺满裁剪框（进来默认全图铺满）
        this.baseScale = Math.max(this.view / iw, this.view / ih)
        this.scale = this.baseScale
        this.tx = (this.view - iw * this.scale) / 2
        this.ty = (this.view - ih * this.scale) / 2
        this.clamp()
        this.$nextTick(() => this.cacheRect())
      }
      img.onerror = () => {
        this._img = null
      }
      img.src = this.src
    },

    clamp() {
      const w = this.imgW * this.scale
      const h = this.imgH * this.scale
      const V = this.view
      if (w <= V) this.tx = (V - w) / 2
      else this.tx = Math.min(0, Math.max(V - w, this.tx))
      if (h <= V) this.ty = (V - h) / 2
      else this.ty = Math.min(0, Math.max(V - h, this.ty))
    },

    // 以裁剪框内某点为锚点缩放：该点下方的画面保持不动
    zoomAt(targetScale, localPoint) {
      if (!this.imgW) return
      const min = this.baseScale
      const max = this.baseScale * 4
      const ns = Math.max(min, Math.min(max, targetScale))
      const s0 = this.scale
      if (Math.abs(ns - s0) < 0.0005) return
      const p = localPoint || { x: this.view / 2, y: this.view / 2 }
      const sx = (p.x - this.tx) / s0
      const sy = (p.y - this.ty) / s0
      this.scale = ns
      this.tx = p.x - sx * ns
      this.ty = p.y - sy * ns
      this.clamp()
    },

    // ---------- 滚轮缩放（电脑） ----------
    bindWheel() {
      const el = this.viewEl()
      if (!el || this._wheelBound) return
      this._onWheel = (e) => {
        e.preventDefault()
        this.cacheRect()
        const p = this.toLocal(e.clientX, e.clientY)
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
        this.zoomAt(this.scale * factor, p)
      }
      el.addEventListener('wheel', this._onWheel, { passive: false })
      this._wheelBound = true
    },
    unbindWheel() {
      const el = this.viewEl()
      if (el && this._onWheel) el.removeEventListener('wheel', this._onWheel)
      this._wheelBound = false
      this._onWheel = null
    },

    // ---------- 触摸 / 鼠标 ----------
    touchPoint(e, i) {
      const t = (e.touches && e.touches[i]) || (e.changedTouches && e.changedTouches[i])
      if (t) return { x: t.clientX, y: t.clientY }
      return null
    },
    mousePoint(e) {
      if (typeof e.clientX === 'number') return { x: e.clientX, y: e.clientY }
      if (e.detail && typeof e.detail.x === 'number') return { x: e.detail.x, y: e.detail.y }
      return null
    },
    dist(a, b) {
      const dx = a.x - b.x
      const dy = a.y - b.y
      return Math.sqrt(dx * dx + dy * dy)
    },

    onStart(e) {
      this.cacheRect()
      const t0 = this.touchPoint(e, 0)
      const t1 = this.touchPoint(e, 1)
      if (t0 && t1) {
        // 双指：开始捏合
        this.pinching = true
        this.dragging = false
        this.pinchDist = this.dist(t0, t1) || 1
        this.pinchScale = this.scale
        const mid = this.toLocal((t0.x + t1.x) / 2, (t0.y + t1.y) / 2)
        this.pinchMidX = mid.x
        this.pinchMidY = mid.y
        return
      }
      const p = t0 || this.mousePoint(e)
      if (!p) return
      this.dragging = true
      this.pinching = false
      this.startX = p.x
      this.startY = p.y
      this.startTx = this.tx
      this.startTy = this.ty
    },

    onMove(e) {
      const t0 = this.touchPoint(e, 0)
      const t1 = this.touchPoint(e, 1)

      if (t1 && this.pinching) {
        const d = this.dist(t0, t1)
        const k = d / (this.pinchDist || 1)
        this.zoomAt(this.pinchScale * k, { x: this.pinchMidX, y: this.pinchMidY })
        return
      }

      if (!this.dragging) return
      const p = t0 || this.mousePoint(e)
      if (!p) return
      this.tx = this.startTx + (p.x - this.startX)
      this.ty = this.startTy + (p.y - this.startY)
      this.clamp()
    },

    onEnd() {
      // 松到只剩一根手指时不继续拖，避免画面跳一下
      this.pinching = false
      this.dragging = false
    },

    onCancel() {
      this.$emit('cancel')
    },

    // 把裁剪框里的那部分画到 320×320 画布
    onConfirm() {
      if (!this._img || !this.imgW) {
        this.$emit('cancel')
        return
      }
      try {
        const V = this.view
        const sx = -this.tx / this.scale
        const sy = -this.ty / this.scale
        const sw = V / this.scale
        const OUT = 320
        const canvas = document.createElement('canvas')
        canvas.width = OUT
        canvas.height = OUT
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, OUT, OUT)
        ctx.drawImage(this._img, sx, sy, sw, sw, 0, 0, OUT, OUT)
        const data = canvas.toDataURL('image/jpeg', 0.85)
        this.$emit('confirm', data)
      } catch (e) {
        this.$emit('cancel')
      }
    }
  }
}
</script>

<style scoped>
.crop-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1200;
  background-color: rgba(20, 22, 31, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}
.crop-panel {
  width: 320px;
  max-width: 92vw;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 20px 18px 16px;
  box-sizing: border-box;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.crop-title {
  font-size: 16px;
  font-weight: 800;
  color: #14161F;
}
.crop-sub {
  font-size: 11.5px;
  color: #8B90A3;
  margin-top: 4px;
  margin-bottom: 12px;
}
.crop-view {
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  background-color: #F2F4FA;
  touch-action: none;
  cursor: move;
}
.crop-img {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform;
}
/* 三分线辅助 */
.crop-grid {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.35) 1px, transparent 1px);
  background-size: 33.33% 33.33%;
}
.crop-ring {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  pointer-events: none;
}
.crop-actions {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-top: 16px;
}
.crop-btn {
  flex: 1;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crop-btn-ghost {
  background-color: #F1F3FA;
  margin-right: 10px;
}
.crop-btn-primary {
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
}
.crop-btn-text {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}
.crop-btn-text-ghost {
  font-size: 14px;
  font-weight: 700;
  color: #6B7080;
}
</style>
