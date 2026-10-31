<template>
  <view class="av" :style="boxStyle">
    <image v-if="isImage" class="av-img" :src="value" mode="aspectFill" />
    <text v-else class="av-emoji" :style="{ fontSize: emojiSize }">{{ value || '🙂' }}</text>
  </view>
</template>

<script>
export default {
  name: 'Avatar',
  props: {
    // emoji 字符串，或 data:image/... 的 base64 图片
    value: { type: String, default: '🙂' },
    // 直径，单位 rpx
    size: { type: Number, default: 88 },
    // 背景色，留空用默认灰底
    bg: { type: String, default: '#f2f4fa' },
    // 圆形 or 圆角方块
    round: { type: Boolean, default: true }
  },
  computed: {
    isImage() {
      return String(this.value || '').indexOf('data:image') === 0
    },
    boxStyle() {
      const s = this.size
      const radius = this.round ? '50%' : Math.round(s * 0.28) + 'rpx'
      return `width:${s}rpx;height:${s}rpx;border-radius:${radius};background-color:${
        this.isImage ? 'transparent' : this.bg
      };`
    },
    emojiSize() {
      return Math.round(this.size * 0.48) + 'rpx'
    }
  }
}
</script>

<style scoped>
.av {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.av-img {
  width: 100%;
  height: 100%;
}
.av-emoji {
  line-height: 1;
  text-align: center;
}
</style>
