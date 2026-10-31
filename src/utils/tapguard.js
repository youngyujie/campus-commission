// 滑动防误触
// 手指在屏幕上移动超过阈值（10px）就判定为「滑动」，
// 抬手时触发的 click/tap 一律忽略，只有原地明确点击才会执行操作。
export default {
  data() {
    return { tgMoved: false }
  },
  methods: {
    tgStart(e) {
      const t = e.touches && e.touches[0]
      this._tgX = t ? t.clientX : 0
      this._tgY = t ? t.clientY : 0
      this.tgMoved = false
    },
    tgMove(e) {
      const t = e.touches && e.touches[0]
      if (!t) return
      if (Math.abs(t.clientX - this._tgX) > 10 || Math.abs(t.clientY - this._tgY) > 10) {
        this.tgMoved = true
      }
    },
    tgCancel() {
      // 手势被系统打断（来电、切后台）也算滑动，避免误触
      this.tgMoved = true
    },
    isTap() {
      return !this.tgMoved
    }
  }
}
