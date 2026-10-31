<template>
  <view class="empty">
    <text class="empty-emoji">{{ emoji }}</text>
    <text class="empty-title">{{ title }}</text>
    <text v-if="desc" class="empty-desc">{{ desc }}</text>
    <view v-if="actionText" class="empty-btn" @tap="$emit('action')">
      <text class="empty-btn-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    emoji: { type: String, default: '🌱' },
    title: { type: String, default: '这里还什么都没有' },
    desc: { type: String, default: '' },
    actionText: { type: String, default: '' }
  },
  emits: ['action']
}
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 90rpx 40rpx;
}
.empty-emoji {
  font-size: 88rpx;
  line-height: 100rpx;
  opacity: 0.9;
}
.empty-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #4a4f63;
  margin-top: 20rpx;
}
.empty-desc {
  font-size: 24rpx;
  color: #b6bac9;
  margin-top: 10rpx;
  text-align: center;
  line-height: 1.6;
}
.empty-btn {
  margin-top: 28rpx;
  height: 72rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background-color: #eef1ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #4c6fff;
}
</style>
