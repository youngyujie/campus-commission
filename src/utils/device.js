// 端判定：桌面端（≥900px）用左侧导航，手机端保持底部 TabBar
export const DESKTOP_MIN_WIDTH = 900

export function isDesktopNow() {
  try {
    const info = uni.getSystemInfoSync()
    return (info.windowWidth || 0) >= DESKTOP_MIN_WIDTH
  } catch (e) {
    return false
  }
}
