<template>
  <view class="hdr" :class="{ 'hdr-solid': solid }">
    <view class="hdr-status" :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="hdr-bar">
      <view v-if="back" class="hdr-back" @tap="goBack">
        <text class="hdr-back-icon">‹</text>
      </view>
      <view v-else class="hdr-back hdr-back-ghost"></view>

      <view class="hdr-center">
        <text class="hdr-title">{{ title }}</text>
        <text v-if="subtitle" class="hdr-sub">{{ subtitle }}</text>
      </view>

      <view class="hdr-right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    back: { type: Boolean, default: true },
    solid: { type: Boolean, default: false }
  },
  data() {
    return { statusBarHeight: 0 }
  },
  created() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack({ delta: 1 })
      else uni.reLaunch({ url: '/pages/hall/hall' })
    }
  }
}
</script>

<style scoped>
.hdr {
  width: 100%;
  background-color: transparent;
}
.hdr-solid {
  background-color: #ffffff;
}
.hdr-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
}
.hdr-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
}
.hdr-back-ghost {
  background-color: transparent;
}
.hdr-back:active {
  opacity: 0.7;
}
.hdr-back-icon {
  font-size: 44rpx;
  line-height: 44rpx;
  color: #14161f;
  margin-top: -6rpx;
  margin-left: -4rpx;
}
.hdr-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.hdr-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #14161f;
  letter-spacing: -0.5rpx;
}
.hdr-sub {
  font-size: 20rpx;
  color: #8b90a3;
  margin-top: 2rpx;
}
.hdr-right {
  width: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
