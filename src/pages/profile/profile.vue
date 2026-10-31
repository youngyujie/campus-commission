<template>
  <view class="cc-page" v-if="user" @touchstart="tgStart" @touchmove="tgMove" @touchcancel="tgCancel">
    <AppHeader :title="isMe ? '我的主页' : 'TA 的主页'" />

    <!-- 资料头 -->
    <view class="hero">
      <view class="h-top">
        <view class="h-avatar-wrap">
          <view @tap="onAvatarClick">
            <Avatar :value="user.avatar" :size="112" bg="rgba(255,255,255,0.22)" />
          </view>
        </view>
        <view class="col flex1">
          <view class="row">
            <text class="h-name">{{ user.nickname || user.name }}</text>
            <view class="h-title" :style="{ backgroundColor: title.soft }" @tap.stop="goTitle">
              <text class="h-title-text" :style="{ color: title.color }">{{ title.emoji }} {{ title.name }}</text>
            </view>
          </view>
          <text class="h-sub">{{ user.college || '未填写院系' }}</text>
          <text v-if="!isMe && user.role !== 'admin'" class="h-sid">学号 {{ maskSid }}</text>
        </view>
        <view class="h-credit">
          <text class="h-credit-num">{{ user.credit }}</text>
          <text class="h-credit-label">信誉分</text>
        </view>
      </view>

      <view class="h-stats">
        <view class="h-stat">
          <text class="h-stat-num">{{ stats.publishedCount }}</text>
          <text class="h-stat-label">发布</text>
        </view>
        <view class="h-stat">
          <text class="h-stat-num">{{ stats.takenCount }}</text>
          <text class="h-stat-label">接取</text>
        </view>
        <view class="h-stat">
          <text class="h-stat-num">{{ stats.doneCount }}</text>
          <text class="h-stat-label">完成</text>
        </view>
        <view class="h-stat">
          <text class="h-stat-num">{{ stats.avgStars || '暂无' }}</text>
          <text class="h-stat-label">评分</text>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 简介与技能 -->
      <view class="card">
        <text class="section-title">个人简介</text>
        <text class="bio">{{ user.bio || '这位同学还没有填写简介' }}</text>
        <view v-if="user.skills && user.skills.length" class="skills">
          <text v-for="(s, i) in user.skills" :key="i" class="skill">{{ s }}</text>
        </view>
      </view>

      <!-- 分段 -->
      <view class="tabs">
        <text
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ 'tab-on': tab === t.key }"
          @tap="tab = t.key"
        >
          {{ t.label }}<text v-if="t.count" class="tab-count">{{ t.count }}</text>
        </text>
      </view>

      <!-- 收到的评价 -->
      <view v-if="tab === 'reviews'">
        <view v-for="r in reviews" :key="r.id" class="card review">
          <view class="row between">
            <view class="row">
              <Avatar :value="r.from.avatar" :size="48" />
              <text class="rv-name">{{ r.from.nickname || r.from.name }}</text>
            </view>
            <text class="rv-stars">{{ starText(r.stars) }}</text>
          </view>
          <view v-if="r.tags && r.tags.length" class="rv-tags">
            <text v-for="(tg, i) in r.tags" :key="i" class="rv-tag">{{ tg }}</text>
          </view>
          <text v-if="r.text" class="rv-text">{{ r.text }}</text>
          <text class="rv-time">{{ timeAgo(r.createdAt) }}</text>
        </view>
        <EmptyState v-if="!reviews.length" emoji="⭐" title="还没有收到评价" desc="完成委托后，对方可以评价" />
      </view>

      <!-- 作品 -->
      <view v-if="tab === 'works'">
        <view v-for="p in works" :key="p.id" class="card">
          <text class="work-title">{{ p.title }}</text>
          <text v-if="p.desc" class="work-desc">{{ p.desc }}</text>
          <view v-if="p.link" class="work-link">
            <text class="work-link-text">📎 {{ p.link }}</text>
          </view>
        </view>
        <EmptyState v-if="!works.length" emoji="🎨" title="还没有作品" desc="技能类委托有作品更容易被选中" />
      </view>

      <!-- TA 发布的 -->
      <view v-if="tab === 'published'">
        <TaskCard v-for="t in published" :key="t.id" :task="t" />
        <EmptyState v-if="!published.length" emoji="📝" title="还没有发布过委托" desc="暂时没有公开的委托" />
      </view>

      <!-- TA 承接的 -->
      <view v-if="tab === 'taken'">
        <TaskCard v-for="t in taken" :key="t.id" :task="t" />
        <EmptyState v-if="!taken.length" emoji="🤝" title="还没有接过委托" desc="暂时没有承接记录" />
      </view>

      <view class="bottom-space"></view>
    </view>

    <!-- 底部固定操作条：始终贴在屏幕底部，不随页面滑动 -->
    <view v-if="!isMe && user.role !== 'admin'" class="bottom-bar">
      <view class="bb-btn bb-ghost" @tap="onFriend">
        <text class="bb-ghost-text">{{ friendLabel }}</text>
      </view>
      <view class="bb-btn bb-primary" @tap="goChat">
        <text class="bb-primary-text">开始聊天</text>
      </view>
    </view>
  <AvatarViewer
    :visible="showViewer"
    :src="user.avatar"
    :name="user.nickname || user.name"
    @close="showViewer = false"
  />

  <AvatarCropper
    :visible="showCrop"
    :src="cropSrc"
    @cancel="onCropCancel"
    @confirm="onCropConfirm"
  />
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import Avatar from '../../components/Avatar.vue'
import AvatarCropper from '../../components/AvatarCropper.vue'
import AvatarViewer from '../../components/AvatarViewer.vue'
import TaskCard from '../../components/TaskCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { creditLevel, tint } from '../../utils/constants.js'
import { pickImage as pickImageFile, pickFiles, compressImage, toAvatarDataUrl } from '../../utils/file.js'
import {
  getUser,
  currentUser,
  myStats,
  listTasks,
  reviewsAbout,
  portfoliosOf,
  friendState,
  requestFriend,
  respondFriend,
  latestTaskWith,
  setAvatarImage,
  setAvatarEmoji,
  currentTitleOf,
  timeAgo
} from '../../utils/store.js'
import tapGuard from '../../utils/tapguard.js'

export default {
  components: { AppHeader, Avatar, TaskCard, EmptyState, AvatarCropper, AvatarViewer },
  mixins: [tapGuard],
  data() {
    return {
      uid: '',
      tab: 'reviews',
      friendTick: 0,
      showViewer: false,
      showCrop: false,
      cropSrc: '',
      tabs: []
    }
  },
  computed: {
    user() {
      return getUser(this.uid)
    },
    me() {
      return currentUser()
    },
    isMe() {
      return !!(this.me && this.me.id === this.uid)
    },
    level() {
      const lv = creditLevel(this.user ? this.user.credit : 60)
      return { ...lv, soft: tint(lv.color, 0.14) }
    },
    title() {
      return currentTitleOf(this.user)
    },
    maskSid() {
      const s = this.user ? this.user.studentId : ''
      if (s.length < 6) return s
      return s.slice(0, 4) + '****'
    },
    stats() {
      return myStats(this.uid)
    },
    friendInfo() {
      // friendTick 参与，保证好友状态变化后能刷新
      return this.friendTick >= 0 && this.me ? friendState(this.me.id, this.uid) : { status: 'none' }
    },
    friendLabel() {
      const st = this.friendInfo.status
      if (st === 'friend') return '已是好友'
      if (st === 'requested') return '已申请'
      if (st === 'incoming') return '同意好友申请'
      return '加好友'
    },
    reviews() {
      return reviewsAbout(this.uid)
    },
    works() {
      return portfoliosOf(this.uid)
    },
    published() {
      return listTasks({ publisherId: this.uid, audit: 'approved' })
    },
    taken() {
      return listTasks({ assigneeId: this.uid, audit: 'approved' })
    }
  },
  onLoad(options) {
    this.uid = options.id || ''
    if (!this.user) {
      uni.showToast({ title: '用户不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack({ delta: 1 }), 700)
      return
    }
    this.refreshTabs()
  },
  onShow() {
    if (this.user) {
      this.friendTick++
      this.refreshTabs()
    }
  },
  methods: {
    timeAgo,
    openAvatarViewer() {
      this.showViewer = true
    },
    async startCrop(path) {
      if (!path) {
        uni.showToast({ title: '没有取到图片', icon: 'none' })
        return
      }
      uni.showLoading({ title: '读取中' })
      const raw = await compressImage(path, { max: 1200, quality: 0.92 })
      uni.hideLoading()
      if (!raw) {
        uni.showToast({ title: '读取图片失败，换一张试试', icon: 'none' })
        return
      }
      this.cropSrc = raw
      this.showCrop = true
    },
    onCropCancel() {
      this.showCrop = false
      this.cropSrc = ''
    },
    onCropConfirm(dataUrl) {
      this.showCrop = false
      this.cropSrc = ''
      if (!dataUrl) {
        uni.showToast({ title: '裁剪失败，换一张试试', icon: 'none' })
        return
      }
      const r = setAvatarImage(dataUrl)
      uni.showToast({ title: r.msg, icon: 'none' })
      if (r.ok) this.friendTick++
    },
    onAvatarClick() {
      if (!this.isMe) {
        this.showViewer = true
        return
      }
      // 自己的头像：点击直接给「更改头像 / 历史头像」，不再单独列入口
      uni.showActionSheet({
        itemList: ['更改头像', '历史头像'],
        success: (res) => {
          if (res.tapIndex === 0) this.onAvatarTap()
          else if (res.tapIndex === 1) uni.navigateTo({ url: '/pages/avatars/avatars' })
        }
      })
    },
    async onAvatarTap() {
      if (!this.isMe) return
      const isImg = String(this.user.avatar || '').indexOf('data:image') === 0
      const items = ['从相册选择', '从文件选择', isImg ? '恢复默认头像' : '换个 emoji 头像']
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          if (res.tapIndex === 0) {
            const f = await pickImageFile()
            if (f) await this.startCrop(f.path)
          } else if (res.tapIndex === 1) {
            const list = await pickFiles({ count: 1 })
            if (list && list.length) await this.startCrop(list[0].path)
          } else if (isImg) {
            const r = setAvatarEmoji('🙂')
            uni.showToast({ title: r.msg, icon: 'none' })
            this.friendTick++
          } else {
            const pool = ['🐰', '🐻', '🐱', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐧', '🦉', '🐙']
            const r = setAvatarEmoji(pool[Math.floor(Math.random() * pool.length)])
            uni.showToast({ title: r.msg, icon: 'none' })
            this.friendTick++
          }
        }
      })
    },
    async applyAvatar(path) {
      if (!path) {
        uni.showToast({ title: '没有取到图片', icon: 'none' })
        return
      }
      uni.showLoading({ title: '处理中' })
      // 先压缩再存，否则手机原图 base64 会超过上限
      const data = await toAvatarDataUrl(path)
      uni.hideLoading()
      if (!data) {
        uni.showToast({ title: '读取图片失败', icon: 'none' })
        return
      }
      const r = setAvatarImage(data)
      uni.showToast({ title: r.msg, icon: 'none' })
      if (r.ok) this.friendTick++
    },
    starText(n) {
      return '★'.repeat(n) + '☆'.repeat(5 - n)
    },
    refreshTabs() {
      this.tabs = [
        { key: 'reviews', label: '收到的评价', count: this.reviews.length },
        { key: 'works', label: '作品', count: this.works.length },
        { key: 'published', label: 'TA 发布的', count: this.published.length },
        { key: 'taken', label: 'TA 承接的', count: this.taken.length }
      ]
    },
    onFriend() {
      if (!this.isTap()) return
      const st = this.friendInfo.status
      if (st === 'friend') {
        uni.showToast({ title: '你们已经是好友了', icon: 'none' })
        return
      }
      if (st === 'requested') {
        uni.showToast({ title: '已发送申请，等对方同意', icon: 'none' })
        return
      }
      if (st === 'incoming') {
        const r = respondFriend(this.friendInfo.row.id, true)
        uni.showToast({ title: r.msg, icon: 'none' })
        this.friendTick++
        return
      }
      const r = requestFriend(this.uid)
      uni.showToast({ title: r.msg, icon: 'none' })
      this.friendTick++
    },
    goChat() {
      if (!this.isTap()) return
      const taskId = latestTaskWith(this.uid)
      uni.navigateTo({ url: `/pages/room/room?taskId=${taskId}&otherId=${this.uid}` })
    },
    goTitle() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/title/title?id=' + this.uid })
    }
  }
}
</script>

<style scoped>
.hero {
  background-color: #4c6fff;
  padding: 28rpx 32rpx 32rpx;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
}
.h-top {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.h-avatar-wrap {
  position: relative;
  margin-right: 20rpx;
}
.h-avatar-edit {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background-color: #ff8a3d;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #4c6fff;
  box-sizing: border-box;
}
.h-avatar-edit-text {
  font-size: 20rpx;
  color: #ffffff;
  line-height: 1;
}
.h-name {
  font-size: 34rpx;
  font-weight: 800;
  color: #ffffff;
  margin-right: 10rpx;
}
.h-level {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.9);
}
.h-level-text {
  font-size: 19rpx;
  font-weight: 700;
}
.h-title {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.h-title-text {
  font-size: 19rpx;
  font-weight: 700;
}
.h-sub {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}
.h-sid {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.62);
  margin-top: 4rpx;
}
.h-credit {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.h-credit-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
}
.h-credit-label {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4rpx;
}
.h-stats {
  display: flex;
  flex-direction: row;
  margin-top: 28rpx;
  background-color: rgba(255, 255, 255, 0.14);
  border-radius: 24rpx;
  padding: 22rpx 0;
}
.h-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.h-stat-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
}
.h-stat-label {
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 6rpx;
}
.h-actions {
  display: flex;
  flex-direction: row;
  margin-top: 24rpx;
}
.h-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.h-btn-ghost {
  background-color: rgba(255, 255, 255, 0.2);
  margin-right: 16rpx;
}
.h-btn-primary {
  background-color: #ffffff;
}
.h-btn-text-ghost {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
.h-btn-text-primary {
  font-size: 26rpx;
  font-weight: 700;
  color: #4c6fff;
}
.body {
  padding: 24rpx 32rpx 180rpx;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 14rpx;
}
.bio {
  display: block;
  font-size: 25rpx;
  color: #4a4f63;
  line-height: 1.6;
}
.skills {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 16rpx;
}
.skill {
  font-size: 22rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
.tabs {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 20rpx;
}
.tab {
  font-size: 24rpx;
  color: #8b90a3;
  font-weight: 600;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
  background-color: #ffffff;
}
.tab-on {
  background-color: #4c6fff;
  color: #ffffff;
}
.tab-count {
  font-size: 18rpx;
  margin-left: 4rpx;
  opacity: 0.85;
}
.review {
  padding: 24rpx;
}
.rv-avatar {
  font-size: 32rpx;
  margin-right: 12rpx;
}
.rv-name {
  font-size: 25rpx;
  font-weight: 600;
  color: #14161f;
}
.rv-stars {
  font-size: 22rpx;
  color: #ff8a3d;
}
.rv-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 12rpx;
}
.rv-tag {
  font-size: 19rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  margin-right: 8rpx;
  margin-bottom: 8rpx;
}
.rv-text {
  display: block;
  font-size: 24rpx;
  color: #4a4f63;
  line-height: 1.55;
  margin-top: 10rpx;
}
.rv-time {
  display: block;
  font-size: 19rpx;
  color: #c3c7d4;
  margin-top: 10rpx;
}
.work-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
}
.work-desc {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.55;
  margin-top: 8rpx;
}
.work-link {
  margin-top: 14rpx;
  background-color: #f7f8fc;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
}
.work-link-text {
  font-size: 21rpx;
  color: #4c6fff;
}
.bottom-space {
  height: 60rpx;
}
.h-earn {
  margin-top: 20rpx;
  text-align: center;
}
.h-earn-text {
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.82);
  background-color: rgba(255, 255, 255, 0.14);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
}
.wallet-hint {
  font-size: 20rpx;
  color: #b6bac9;
}
.wallet-row {
  display: flex;
  flex-direction: row;
  margin-top: 22rpx;
  background-color: #f7f8fc;
  border-radius: 20rpx;
  padding: 24rpx 0;
}
.w-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.w-num {
  font-size: 34rpx;
  font-weight: 800;
  color: #14161f;
  line-height: 1.1;
  letter-spacing: -0.5rpx;
}
.w-num.income {
  color: #21c7a8;
}
.w-num.expense {
  color: #ff8a3d;
}
.w-label {
  font-size: 19rpx;
  color: #8b90a3;
  margin-top: 8rpx;
}
.ledger {
  margin-top: 26rpx;
}
.ledger-title {
  display: block;
  font-size: 22rpx;
  color: #8b90a3;
  margin-bottom: 8rpx;
}
.lg {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 2rpx solid #f2f4fa;
}
.lg-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.lg-in {
  background-color: #e6faf6;
}
.lg-out {
  background-color: #fff2e8;
}
.lg-icon-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #4a4f63;
}
.lg-title {
  font-size: 24rpx;
  color: #14161f;
  font-weight: 600;
}
.lg-time {
  font-size: 19rpx;
  color: #b6bac9;
  margin-top: 4rpx;
}
.lg-amt {
  font-size: 28rpx;
  font-weight: 800;
  margin-left: 12rpx;
}
.lg-amt.income {
  color: #21c7a8;
}
.lg-amt.expense {
  color: #ff8a3d;
}
.lg-more {
  padding: 20rpx 0 6rpx;
  text-align: center;
}
.lg-more-text {
  font-size: 21rpx;
  color: #4c6fff;
}
.lg-empty {
  display: block;
  font-size: 22rpx;
  color: #b6bac9;
  padding: 20rpx 0;
  text-align: center;
}

/* 底部固定操作条：贴在屏幕底部，不随页面滑动；按钮立体上浮 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: row;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8rpx 24rpx rgba(15, 23, 42, 0.08);
  border-top: 2rpx solid #eef1f7;
}
.bb-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms cubic-bezier(0, 0, 0.58, 1), box-shadow 160ms, filter 160ms;
}
.bb-btn:active {
  transform: translateY(3rpx) scale(0.985);
  filter: brightness(0.96);
}
.bb-ghost {
  background-color: #f1f3fa;
  margin-right: 16rpx;
  box-shadow: 0 10rpx 22rpx -10rpx rgba(15, 23, 42, 0.3), 0 3rpx 8rpx rgba(15, 23, 42, 0.06);
}
.bb-primary {
  background-image: linear-gradient(135deg, #5b7cff, #3355e8);
  box-shadow: 0 14rpx 26rpx -10rpx rgba(76, 111, 255, 0.6), 0 4rpx 10rpx rgba(76, 111, 255, 0.2);
}
.bb-ghost-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #4a4f63;
}
.bb-primary-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
