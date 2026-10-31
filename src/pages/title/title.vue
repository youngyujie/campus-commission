<template>
  <view class="cc-page title-page">
    <AppHeader :title="isMe ? '我的称号' : 'TA 的称号'" />

    <!-- 当前称号 -->
    <view class="hero" :style="{ backgroundImage: heroBg }">
      <text class="hero-emoji">{{ current.emoji }}</text>
      <text class="hero-name">{{ current.name }}</text>
      <text class="hero-desc">{{ current.desc }}</text>
      <view class="hero-credit">
        <text class="hero-credit-text">信誉分 {{ user ? user.credit : '--' }}</text>
      </view>
    </view>

    <view class="body">
      <!-- 我的进度（仅自己） -->
      <view v-if="isMe" class="card progress-card">
        <text class="card-title">称号进度</text>
        <view class="prog">
          <view class="prog-row">
            <text class="prog-label">完成他人委托</text>
            <text class="prog-val">{{ stats.takenDoneCount }} / 10</text>
          </view>
          <view class="bar"><view class="bar-in" :style="{ width: pct(stats.takenDoneCount) }"></view></view>
        </view>
        <view class="prog">
          <view class="prog-row">
            <text class="prog-label">发布并被他人完成</text>
            <text class="prog-val">{{ stats.publishedDoneCount }} / 10</text>
          </view>
          <view class="bar"><view class="bar-in bar-in-yu" :style="{ width: pct(stats.publishedDoneCount) }"></view></view>
        </view>
        <text class="prog-tip">两个称号都要求信誉分 ≥ 95</text>
      </view>

      <!-- 全部称号 -->
      <text class="section-label">全部称号（{{ earned.length }} / {{ titles.length }} 已解锁）</text>
      <view
        v-for="t in titles"
        :key="t.key"
        class="tcard"
        :class="{ 'tcard-on': current.key === t.key, 'tcard-lock': !isEarned(t.key) }"
      >
        <view class="tcard-left">
          <view class="tcard-badge" :style="{ backgroundColor: t.soft }">
            <text class="tcard-emoji">{{ t.emoji }}</text>
          </view>
        </view>
        <view class="tcard-main">
          <view class="tcard-head">
            <text class="tcard-name" :style="{ color: t.color }">{{ t.name }}</text>
            <text v-if="current.key === t.key" class="tcard-tag tag-cur">当前使用</text>
            <text v-else-if="isEarned(t.key)" class="tcard-tag tag-got">已获得</text>
            <text v-else class="tcard-tag tag-lock">未解锁</text>
          </view>
          <text class="tcard-desc">{{ t.desc }}</text>
          <view class="tcard-path">
            <text class="tcard-path-label">获取途径</text>
            <text class="tcard-path-text">{{ t.path }}</text>
          </view>
        </view>
        <view
          v-if="isMe && isEarned(t.key) && current.key !== t.key"
          class="tcard-btn"
          :style="{ backgroundColor: t.color }"
          @tap="useTitle(t.key)"
        >
          <text class="tcard-btn-text">使用</text>
        </view>
      </view>

      <view v-if="!isMe" class="note">
        <text class="note-text">称号由同学的信誉与完成记录自动评定，无法手动修改</text>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import { TITLES, tint } from '../../utils/constants.js'
import {
  getUser,
  currentUser,
  myStats,
  earnedTitles,
  currentTitleOf,
  setCurrentTitle,
  guardLogin
} from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      uid: '',
      tick: 0,
      titles: TITLES
    }
  },
  computed: {
    me() {
      return currentUser()
    },
    isMe() {
      return !!(this.me && (!this.uid || this.me.id === this.uid))
    },
    user() {
      return this.isMe ? this.me : getUser(this.uid)
    },
    earned() {
      this.tick
      return this.user ? earnedTitles(this.user) : ['chu']
    },
    current() {
      this.tick
      return this.user ? currentTitleOf(this.user) : TITLES[0]
    },
    stats() {
      this.tick
      return myStats(this.user ? this.user.id : undefined)
    },
    heroBg() {
      return `linear-gradient(135deg, ${this.current.color}, ${tint(this.current.color, 0.72)})`
    }
  },
  onLoad(options) {
    if (!guardLogin()) return
    this.uid = options && options.id ? options.id : ''
  },
  onShow() {
    this.tick++
  },
  methods: {
    isEarned(key) {
      return this.earned.indexOf(key) >= 0
    },
    pct(n) {
      const p = Math.min(100, Math.round((Number(n) || 0) * 10))
      return p + '%'
    },
    useTitle(key) {
      const r = setCurrentTitle(key)
      uni.showToast({ title: r.msg, icon: 'none' })
      if (r.ok) this.tick++
    }
  }
}
</script>

<style scoped>
.title-page {
  min-height: 100vh;
  background-color: #f5f7fb;
}
.hero {
  margin: 8rpx 32rpx 0;
  border-radius: 32rpx;
  padding: 44rpx 32rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 18rpx 40rpx -16rpx rgba(15, 23, 42, 0.28);
}
.hero-emoji {
  font-size: 96rpx;
  line-height: 1;
}
.hero-name {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffffff;
  margin-top: 16rpx;
  letter-spacing: 1rpx;
}
.hero-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
  margin-top: 10rpx;
  text-align: center;
}
.hero-credit {
  margin-top: 20rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  padding: 8rpx 24rpx;
}
.hero-credit-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}
.body {
  padding: 28rpx 32rpx 60rpx;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: 0 14rpx 32rpx -14rpx rgba(15, 23, 42, 0.14), 0 4rpx 10rpx rgba(15, 23, 42, 0.04);
}
.progress-card {
  margin-bottom: 30rpx;
}
.card-title {
  display: block;
  font-size: 27rpx;
  font-weight: 800;
  color: #14161f;
  margin-bottom: 20rpx;
}
.prog {
  margin-bottom: 18rpx;
}
.prog-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.prog-label {
  font-size: 23rpx;
  color: #4a4f63;
}
.prog-val {
  font-size: 22rpx;
  font-weight: 700;
  color: #4c6fff;
}
.bar {
  height: 12rpx;
  border-radius: 999rpx;
  background-color: #eef1f7;
  overflow: hidden;
}
.bar-in {
  height: 100%;
  border-radius: 999rpx;
  background-image: linear-gradient(90deg, #ffb27a, #ff8a3d);
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.bar-in-yu {
  background-image: linear-gradient(90deg, #7f9bff, #4c6fff);
}
.prog-tip {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 6rpx;
}
.section-label {
  display: block;
  font-size: 22rpx;
  color: #8b90a3;
  margin: 0 6rpx 16rpx;
}
.tcard {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 26rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  border: 2rpx solid transparent;
  box-shadow: 0 12rpx 28rpx -16rpx rgba(15, 23, 42, 0.16), 0 4rpx 10rpx rgba(15, 23, 42, 0.03);
}
.tcard-on {
  border-color: #c9d5ff;
  box-shadow: 0 16rpx 34rpx -14rpx rgba(76, 111, 255, 0.3), 0 4rpx 10rpx rgba(76, 111, 255, 0.08);
}
.tcard-lock {
  opacity: 0.66;
}
.tcard-left {
  margin-right: 20rpx;
}
.tcard-badge {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tcard-emoji {
  font-size: 44rpx;
}
.tcard-main {
  flex: 1;
  min-width: 0;
}
.tcard-head {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.tcard-name {
  font-size: 30rpx;
  font-weight: 800;
  margin-right: 12rpx;
}
.tcard-tag {
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.tag-cur {
  color: #4c6fff;
  background-color: #eef1ff;
}
.tag-got {
  color: #17977f;
  background-color: #e6faf6;
}
.tag-lock {
  color: #9aa0b4;
  background-color: #f1f3f9;
}
.tcard-desc {
  display: block;
  font-size: 22rpx;
  color: #8b90a3;
  margin-top: 6rpx;
}
.tcard-path {
  margin-top: 12rpx;
  background-color: #f7f8fc;
  border-radius: 12rpx;
  padding: 12rpx 14rpx;
}
.tcard-path-label {
  font-size: 19rpx;
  color: #b6bac9;
  margin-right: 8rpx;
}
.tcard-path-text {
  font-size: 21rpx;
  color: #4a4f63;
  line-height: 1.5;
}
.tcard-btn {
  height: 60rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 14rpx;
  flex-shrink: 0;
  box-shadow: 0 8rpx 18rpx -6rpx rgba(76, 111, 255, 0.5);
}
.tcard-btn:active {
  transform: translateY(2rpx) scale(0.96);
}
.tcard-btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}
.note {
  margin-top: 10rpx;
  padding: 0 8rpx;
}
.note-text {
  font-size: 20rpx;
  color: #b6bac9;
  line-height: 1.6;
}
</style>
