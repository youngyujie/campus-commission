<template>
  <view v-if="visible" class="av-mask" @tap="close">
    <view class="av-stage">
      <Avatar :value="src" :size="size" bg="rgba(255,255,255,0.16)" />
      <text v-if="name" class="av-name">{{ name }}</text>
    </view>
    <text class="av-hint">点击任意处关闭</text>
  </view>
</template>

<script>
import Avatar from './Avatar.vue'

export default {
  name: 'AvatarViewer',
  components: { Avatar },
  props: {
    visible: { type: Boolean, default: false },
    src: { type: String, default: '🙂' },
    name: { type: String, default: '' }
  },
  data() {
    return { size: 260 }
  },
  mounted() {
    try {
      const info = uni.getSystemInfoSync()
      const w = info.windowWidth || 375
      this.size = Math.min(300, Math.round(w * 0.68))
    } catch (e) {
      this.size = 240
    }
  },
  methods: {
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.av-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1500;
  background-color: rgba(8, 14, 12, 0.86);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.av-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: avIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.av-name {
  margin-top: 18px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}
.av-hint {
  position: absolute;
  bottom: 48px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}
@keyframes avIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
