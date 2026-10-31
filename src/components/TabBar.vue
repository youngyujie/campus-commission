<template>
  <view class="tabbar-wrap">
    <view class="tabbar">
      <!-- 选中胶囊：浅薄荷绿填充 + 细薄荷绿描边，300ms 平滑左右滑动 -->
      <view class="tab-pill" :style="{ transform: 'translateX(' + (pillIdx * 100) + '%)' }">
        <view class="tab-pill-inner"></view>
      </view>
      <view
        v-for="(item, index) in items"
        :key="item.key"
        class="tab"
        :class="{ 'tab-active': localIdx === index }"
        @tap="go(item)"
      >
        <view class="tab-icon-wrap">
          <text class="tab-emoji">{{ item.emoji }}</text>
          <view v-if="item.key === 'chat' && unread > 0" class="tab-badge">
            <text class="tab-badge-text">{{ unread > 99 ? '99+' : unread }}</text>
          </view>
        </view>
        <text class="tab-label">{{ item.label }}</text>
      </view>
    </view>
    <view class="tabbar-safe"></view>
  </view>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    active: { type: String, default: 'hall' },
    unread: { type: Number, default: 0 }
  },
  data() {
    return {
      localIdx: 0,
      navigating: false,
      items: [
        { key: 'hall', label: '大厅', emoji: '🏠', path: '/pages/hall/hall' },
        { key: 'chat', label: '消息', emoji: '💬', path: '/pages/chat/chat' },
        { key: 'publish', label: '发布', emoji: '✏️', path: '/pages/publish/publish', primary: true },
        { key: 'mine', label: '我的', emoji: '👤', path: '/pages/mine/mine' }
      ]
    }
  },
  computed: {
    activeIdx() {
      const i = this.items.findIndex((it) => it.key === this.active)
      return i < 0 ? 0 : i
    },
    pillIdx() {
      return this.localIdx
    }
  },
  watch: {
    active(v) {
      const i = this.items.findIndex((it) => it.key === v)
      if (i >= 0) this.localIdx = i
    }
  },
  created() {
    const i = this.items.findIndex((it) => it.key === this.active)
    this.localIdx = i < 0 ? 0 : i
  },
  methods: {
    go(item) {
      if (this.navigating) return
      if (item.key === this.active) return
      const i = this.items.findIndex((it) => it.key === item.key)
      if (i >= 0) this.localIdx = i
      this.navigating = true
      // 先让胶囊平滑滑到目标标签，再切页；统一用 reLaunch，销毁旧页避免导航卡死
      setTimeout(() => {
        uni.reLaunch({
          url: item.path,
          complete: () => {
            this.navigating = false
          }
        })
      }, 300)
    }
  }
}
</script>

<style scoped>
.tabbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  padding: 0 24rpx;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  pointer-events: none;
}
/* 悬浮立体椭圆：与页面背景分离（四周留白 + 投影） */
.tabbar {
  position: relative;
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  height: 112rpx;
  padding: 0 16rpx;
  margin-bottom: 26rpx;
  background-color: #ffffff;
  border-radius: 999rpx;
  border: 2rpx solid rgba(237, 239, 246, 0.9);
  box-shadow: 0 16rpx 36rpx -12rpx rgba(20, 22, 31, 0.24), 0 4rpx 12rpx rgba(20, 22, 31, 0.05);
}
/* 选中胶囊：浅薄荷绿填充 + 细薄荷绿描边，300ms 柔和滑动 */
.tab-pill {
  position: absolute;
  left: 16rpx;
  top: 0;
  height: 112rpx;
  width: calc((100% - 32rpx) / 4);
  z-index: 0;
  pointer-events: none;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.tab-pill-inner {
  position: absolute;
  left: 10rpx;
  right: 10rpx;
  top: 12rpx;
  bottom: 12rpx;
  border-radius: 999rpx;
  background-color: #e8faf4;
  border: 2rpx solid #86e0c9;
  box-shadow: 0 4rpx 12rpx rgba(33, 199, 168, 0.14);
}
.tabbar-safe {
  display: none;
}
.tab {
  flex: 1;
  height: 108rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.tab-icon-wrap {
  position: relative;
}
.tab-emoji {
  font-size: 34rpx;
  line-height: 38rpx;
  opacity: 0.45;
  transition: all 0.16s ease;
}
.tab-active .tab-emoji {
  opacity: 1;
  transform: translateY(-1rpx) scale(1.04);
}
.tab-label {
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 4rpx;
  font-weight: 600;
}
.tab-active .tab-label {
  color: #0f9d7f;
}
.tab-badge {
  position: absolute;
  top: -8rpx;
  right: -20rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background-color: #f04a4a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.tab-badge-text {
  font-size: 18rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 28rpx;
}
</style>
