<template>
  <view class="cc-page avatars-page">
    <AppHeader title="历史头像" />

    <!-- 顶部：当前选中的头像（大图） -->
    <view class="preview">
      <view class="preview-stage">
        <view class="preview-box" :class="{ 'preview-box-on': list.length }">
          <image v-if="selUrl" class="preview-img" :src="selUrl" mode="aspectFill" />
          <view v-else class="preview-empty">
            <text class="preview-empty-text">🙂</text>
          </view>
        </view>
      </view>
      <text class="preview-tip">{{ list.length ? '点下方头像即可直接设为当前头像' : '还没有历史头像' }}</text>
    </view>

    <view class="body">
      <view v-if="list.length" class="grid">
        <view
          v-for="(url, i) in list"
          :key="'h' + i"
          class="thumb"
          :class="{ 'thumb-picked': i === selIdx }"
          @tap="pick(i)"
        >
          <image class="thumb-img" :src="url" mode="aspectFill" />
          <view v-if="url === currentAvatar" class="thumb-cur">
            <text class="thumb-cur-text">当前</text>
          </view>
        </view>
      </view>

      <view v-else class="empty">
        <text class="empty-emoji">🖼️</text>
        <text class="empty-title">还没有历史头像</text>
        <text class="empty-desc">换一次图片头像后，用过的头像会出现在这里，随时可以换回来</text>
        <view class="empty-btn" @tap="goMine">
          <text class="empty-btn-text">去换头像</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import {
  currentUser,
  avatarHistory,
  useAvatarFromHistory,
  guardLogin
} from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      list: [],
      selIdx: 0,
      currentAvatar: ''
    }
  },
  computed: {
    selUrl() {
      return this.list[this.selIdx] || ''
    }
  },
  onLoad() {
    if (!guardLogin()) return
    this.load()
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      const me = currentUser()
      this.currentAvatar = me ? me.avatar : ''
      this.list = avatarHistory()
      if (!this.list.length) {
        this.selIdx = 0
        return
      }
      // 默认把当前正在用的那张（如果在历史里）选为选中态，否则选第一张
      const idx = this.list.indexOf(this.currentAvatar)
      this.selIdx = idx >= 0 ? idx : 0
    },
    pick(i) {
      if (i === this.selIdx) {
        // 再点一次也执行一次「设为当前」，方便确认
        this.apply(i)
        return
      }
      this.selIdx = i
      this.apply(i)
    },
    apply(i) {
      const url = this.list[i]
      if (!url) return
      const r = useAvatarFromHistory(url)
      if (r.ok) {
        this.currentAvatar = url
        uni.showToast({ title: '已设为当前头像', icon: 'none' })
      } else {
        uni.showToast({ title: r.msg || '设置失败', icon: 'none' })
      }
    },
    goMine() {
      uni.reLaunch({ url: '/pages/mine/mine' })
    }
  }
}
</script>

<style scoped>
.avatars-page {
  min-height: 100vh;
  background-color: #f5f7fb;
}
.preview {
  padding: 20rpx 32rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-stage {
  height: 360rpx;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
/* 大图：被「举起来」，下方黑色模糊阴影 */
.preview-box {
  width: 260rpx;
  height: 260rpx;
  border-radius: 40rpx;
  overflow: hidden;
  background-color: #eef1f7;
  box-shadow: 0 40rpx 46rpx -18rpx rgba(0, 0, 0, 0.55), 0 16rpx 24rpx -12rpx rgba(0, 0, 0, 0.4);
  transform: translateY(-18rpx);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.preview-box-on {
  animation: floatIn 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes floatIn {
  0% {
    transform: translateY(6rpx) scale(0.94);
    opacity: 0.4;
  }
  100% {
    transform: translateY(-18rpx) scale(1);
    opacity: 1;
  }
}
.preview-img {
  width: 100%;
  height: 100%;
}
.preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-empty-text {
  font-size: 90rpx;
}
.preview-tip {
  font-size: 22rpx;
  color: #8b90a3;
  margin-top: 30rpx;
}
.body {
  padding: 28rpx 32rpx 60rpx;
}
.grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}
/* 矩形（圆角方块）历史头像 */
.thumb {
  position: relative;
  width: 31.5%;
  height: 200rpx;
  border-radius: 22rpx;
  overflow: visible;
  margin-bottom: 34rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.08);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.thumb-img {
  width: 100%;
  height: 100%;
  border-radius: 22rpx;
  display: block;
}
/* 选中：向上浮动 + 头像下方黑色模糊阴影，300ms 丝滑 */
.thumb-picked {
  transform: translateY(-16rpx) scale(1.02);
  box-shadow: 0 30rpx 34rpx -14rpx rgba(0, 0, 0, 0.55), 0 10rpx 18rpx -8rpx rgba(0, 0, 0, 0.4);
  z-index: 2;
}
.thumb-cur {
  position: absolute;
  left: 8rpx;
  bottom: 8rpx;
  background-color: rgba(76, 111, 255, 0.92);
  border-radius: 999rpx;
  padding: 3rpx 12rpx;
}
.thumb-cur-text {
  font-size: 17rpx;
  color: #ffffff;
  font-weight: 700;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
}
.empty-emoji {
  font-size: 72rpx;
}
.empty-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #14161f;
  margin-top: 20rpx;
}
.empty-desc {
  font-size: 22rpx;
  color: #8b90a3;
  text-align: center;
  line-height: 1.6;
  margin-top: 12rpx;
}
.empty-btn {
  margin-top: 28rpx;
  height: 76rpx;
  padding: 0 44rpx;
  border-radius: 999rpx;
  background-image: linear-gradient(135deg, #5b7cff, #3355e8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx -8rpx rgba(76, 111, 255, 0.5);
}
.empty-btn:active {
  transform: translateY(2rpx) scale(0.97);
}
.empty-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
