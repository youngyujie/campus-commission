<template>
  <view class="cc-page">
    <AppHeader title="评价" />

    <view class="body">
      <view v-if="task" class="card">
        <text class="tip">这次委托已经完成，给 {{ targetName }} 一个评价吧</text>
        <view class="task-line">
          <text class="task-emoji">{{ task.cat.emoji }}</text>
          <text class="task-title ellipsis">{{ task.title }}</text>
        </view>
      </view>

      <!-- 星级 -->
      <view class="card">
        <text class="label">整体评价</text>
        <view class="stars">
          <text
            v-for="n in 5"
            :key="n"
            class="star"
            :class="{ 'star-on': n <= stars }"
            @tap="stars = n"
          >
            ★
          </text>
        </view>
        <text class="star-text">{{ starText }}</text>
      </view>

      <!-- 标签 -->
      <view class="card">
        <text class="label">印象标签（可多选）</text>
        <view class="tags">
          <text
            v-for="t in tagOptions"
            :key="t"
            class="tag"
            :class="{ 'tag-on': tags.indexOf(t) >= 0 }"
            @tap="toggleTag(t)"
          >
            {{ t }}
          </text>
        </view>
      </view>

      <!-- 留言 -->
      <view class="card">
        <text class="label">说点什么（可选）</text>
        <textarea
          v-model="text"
          class="textarea"
          maxlength="120"
          placeholder="写得具体一点，对其他人更有参考价值"
          placeholder-class="ph"
        />
        <text class="counter">{{ text.length }}/120</text>
      </view>

      <view class="bottom-space"></view>
    </view>

    <view class="actionbar">
      <view class="actionbar-inner">
        <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': !stars }" @tap="submit">
          提交评价
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import { REVIEW_TAGS } from '../../utils/constants.js'
import { getTask, currentUser, addReview, getUser } from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      taskId: '',
      stars: 5,
      tags: [],
      text: '',
      tagOptions: REVIEW_TAGS
    }
  },
  computed: {
    task() {
      return getTask(this.taskId)
    },
    me() {
      return currentUser()
    },
    targetName() {
      const t = this.task
      if (!t || !this.me) return '对方'
      const isPub = t.publisherId === this.me.id
      const u = isPub ? t.assignee : t.publisher
      return u ? u.nickname || u.name : '对方'
    },
    starText() {
      const map = { 1: '很不满意', 2: '不太满意', 3: '一般', 4: '满意', 5: '非常满意' }
      return map[this.stars] || ''
    }
  },
  onLoad(options) {
    this.taskId = options.taskId || ''
  },
  methods: {
    toggleTag(t) {
      const i = this.tags.indexOf(t)
      if (i >= 0) this.tags.splice(i, 1)
      else this.tags.push(t)
    },
    submit() {
      if (!this.stars) {
        uni.showToast({ title: '请选择星级', icon: 'none' })
        return
      }
      const r = addReview({
        taskId: this.taskId,
        stars: this.stars,
        tags: this.tags,
        text: this.text
      })
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      uni.showToast({ title: '评价已提交', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) uni.navigateBack({ delta: 1 })
        else uni.reLaunch({ url: '/pages/hall/hall' })
      }, 600)
    }
  }
}
</script>

<style scoped>
.body {
  padding: 24rpx 32rpx 0;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
.tip {
  display: block;
  font-size: 25rpx;
  color: #8b90a3;
}
.task-line {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 14rpx;
}
.task-emoji {
  font-size: 26rpx;
  margin-right: 10rpx;
}
.task-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
  flex: 1;
}
.label {
  display: block;
  font-size: 25rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 18rpx;
}
.stars {
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: 10rpx 0;
}
.star {
  font-size: 64rpx;
  color: #e3e6f0;
  margin: 0 12rpx;
  line-height: 1;
}
.star-on {
  color: #ff8a3d;
}
.star-text {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #8b90a3;
  margin-top: 10rpx;
}
.tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.tag {
  font-size: 24rpx;
  color: #4a4f63;
  background-color: #f2f4fa;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
}
.tag-on {
  background-color: #eef1ff;
  color: #4c6fff;
  font-weight: 700;
}
.textarea {
  width: 100%;
  height: 180rpx;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #14161f;
  box-sizing: border-box;
}
.ph {
  color: #b6bac9;
  font-size: 25rpx;
}
.counter {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #c3c7d4;
  margin-top: 8rpx;
}
.bottom-space {
  height: 200rpx;
}
.actionbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ffffff;
  border-top: 2rpx solid #edeff6;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 80;
}
.actionbar-inner {
  display: flex;
  flex-direction: row;
}
</style>
