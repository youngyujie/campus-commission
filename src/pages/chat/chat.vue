<template>
  <view class="cc-page" :class="{ 'has-side': isDesktop }" @touchstart="tgStart" @touchmove="tgMove" @touchcancel="tgCancel">
    <AppHeader title="消息" :back="false" />

    <view class="tabs">
      <text class="tab" :class="{ 'tab-on': tab === 'chat' }" @tap="switchTab('chat')">
        私聊<text v-if="convList.length" class="tab-count">{{ convList.length }}</text>
      </text>
      <text class="tab" :class="{ 'tab-on': tab === 'notice' }" @tap="switchTab('notice')">
        通知<text v-if="unread" class="tab-count">{{ unread }}</text>
      </text>
      <text class="tab" :class="{ 'tab-on': tab === 'friend' }" @tap="switchTab('friend')">
        好友<text v-if="requests.length" class="tab-count">{{ requests.length }}</text>
      </text>
    </view>

    <!-- 私聊列表 -->
    <view v-if="tab === 'chat'" class="list">
      <view v-for="c in convList" :key="c.taskId + c.otherId" class="conv" @tap="openRoom(c)">
        <Avatar :value="c.other.avatar" :size="84" />
        <view class="col flex1">
          <view class="row between">
            <text class="conv-name">{{ c.other.nickname || c.other.name }}</text>
            <text class="conv-time">{{ c.timeLabel }}</text>
          </view>
          <text class="conv-task ellipsis">{{ c.task ? '关于：' + c.task.title : '私聊' }}</text>
          <text class="conv-last ellipsis">{{ c.text || '[图片]' }}</text>
        </view>
      </view>

      <EmptyState
        v-if="!convList.length"
        emoji="💬"
        title="还没有聊天记录"
        desc="接单或被接单后，就可以和对方沟通了"
        action-text="去大厅看看"
        @action="goHall"
      />
    </view>

    <!-- 通知列表 -->
    <view v-else-if="tab === 'notice'" class="list">
      <view class="row between notice-head">
        <text class="t-muted">{{ notices.length }} 条通知</text>
        <text class="notice-read" @tap="readAll">全部标为已读</text>
      </view>

      <view
        v-for="n in notices"
        :key="n.id"
        class="notice"
        :class="{ 'notice-unread': !n.read }"
        @tap="openNotice(n)"
      >
        <view class="notice-icon" :style="{ backgroundColor: iconBg(n.type) }">
          <text class="notice-emoji">{{ iconOf(n.type) }}</text>
        </view>
        <view class="col flex1">
          <view class="row between">
            <text class="notice-title">{{ n.title }}</text>
            <text class="notice-time">{{ n.timeLabel }}</text>
          </view>
          <text class="notice-body">{{ n.body }}</text>
        </view>
        <view v-if="!n.read" class="dot"></view>
      </view>

      <EmptyState v-if="!notices.length" emoji="🔔" title="暂时没有通知" desc="有报价、交付、审核结果时会在这里提醒你" />
    </view>

    <!-- 好友 -->
    <view v-if="tab === 'friend'" class="list">
      <!-- 按手机号搜同学 -->
      <view class="search-card">
        <text class="search-title">按手机号找同学</text>
        <view class="search-row">
          <input
            v-model="phoneQuery"
            class="search-input"
            type="number"
            maxlength="11"
            placeholder="输入完整的 11 位手机号"
            placeholder-class="ph"
            confirm-type="search"
            @confirm="doSearch"
          />
          <view class="search-btn" @tap="doSearch">
            <text class="search-btn-text">搜索</text>
          </view>
        </view>
        <text class="search-hint">输入对方完整 11 位手机号，搜到后点卡片进入 TA 的主页，可在主页加好友 / 开始聊天（也可以搜自己的手机号）</text>

        <text v-if="searchErr" class="search-err">{{ searchErr }}</text>

        <view v-for="u in searchResult" :key="u.id" class="ucard" @tap="openProfile(u.id)">
          <Avatar :value="u.avatar" :size="92" />
          <view class="col flex1 ucard-main">
            <view class="row ucard-name-row">
              <text class="ucard-name">{{ u.nickname }}</text>
              <view class="ucard-title" :style="{ backgroundColor: titleSoft(u) }">
                <text class="ucard-title-text" :style="{ color: titleColor(u) }">{{ u.titleEmoji }} {{ u.title }}</text>
              </view>
            </view>
            <text class="ucard-sub">{{ u.college || '未填写院系' }} · 信誉 {{ u.credit }}</text>
            <text class="ucard-phone">{{ u.isMe ? '这是你自己的手机号' : u.phoneMasked }}</text>
          </view>
          <text class="ucard-arrow">›</text>
        </view>
      </view>

      <view v-if="requests.length" class="group">
        <text class="group-title">待处理的好友申请</text>
        <view v-for="r in requests" :key="r.id" class="fr">
          <view @tap="openProfile(r.from.id)"><Avatar :value="r.from.avatar" :size="84" /></view>
          <view class="col flex1">
            <text class="conv-name">{{ r.from.nickname || r.from.name }}</text>
            <text class="fr-sub">{{ r.from.college || '未填写院系' }} · {{ r.timeLabel }}</text>
          </view>
          <view class="fr-btn fr-btn-ghost" @tap="reject(r)">
            <text class="fr-btn-text-ghost">拒绝</text>
          </view>
          <view class="fr-btn fr-btn-primary" @tap="accept(r)">
            <text class="fr-btn-text-primary">同意</text>
          </view>
        </view>
      </view>

      <view class="group">
        <text class="group-title">我的好友（{{ friends.length }}）</text>
        <view v-for="f in friends" :key="f.id" class="fr">
          <view @tap="openProfile(f.id)"><Avatar :value="f.avatar" :size="84" /></view>
          <view class="col flex1">
            <text class="conv-name">{{ f.nickname || f.name }}</text>
            <text class="fr-sub">{{ f.college || '未填写院系' }} · 信誉 {{ f.credit }}</text>
          </view>
          <view class="fr-btn fr-btn-ghost" @tap="chatWith(f)">
            <text class="fr-btn-text-ghost">发消息</text>
          </view>
        </view>
        <text v-if="!friends.length" class="fr-empty">还没有好友，在别人主页点「加好友」</text>
      </view>

      <view class="fr-tip">
        <text class="fr-tip-text">💡 非好友之间只能临时聊 10 句，加为好友后不限次数</text>
      </view>
    </view>

    <SideNav v-if="isDesktop" active="chat" :unread="unread" />
    <TabBar v-else active="chat" :unread="unread" />
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import Avatar from '../../components/Avatar.vue'
import TabBar from '../../components/TabBar.vue'
import SideNav from '../../components/SideNav.vue'
import EmptyState from '../../components/EmptyState.vue'
import {
  currentUser,
  guardLogin,
  conversations,
  notificationsOf,
  unreadCount,
  markAllRead,
  incomingRequests,
  friendsOf,
  respondFriend,
  requestFriend,
  searchUserByPhone,
  latestTaskWith
} from '../../utils/store.js'
import { TITLES } from '../../utils/constants.js'
import { isDesktopNow } from '../../utils/device.js'
import tapGuard from '../../utils/tapguard.js'

export default {
  components: { AppHeader, TabBar, SideNav, EmptyState, Avatar },
  mixins: [tapGuard],
  data() {
    return {
      isDesktop: false,
      tab: 'chat',
      unread: 0,
      convList: [],
      notices: [],
      requests: [],
      friends: [],
      phoneQuery: '',
      searchErr: '',
      searchResult: []
    }
  },
  onLoad() {
    this.isDesktop = isDesktopNow()
    if (!guardLogin()) return
    this.refresh()
  },
  onUnload() {
    uni.$off('state:sync', this.onRemoteSync)
  },
  onShow() {
    uni.$off('state:sync', this.onRemoteSync)
    uni.$on('state:sync', this.onRemoteSync)
    this.refresh()
  },
  methods: {
    onRemoteSync() {
      // 别的设备改了数据，这里重新拉一遍
      this.refresh()
    },
    refresh() {
      this.unread = unreadCount()
      this.convList = conversations()
      this.notices = notificationsOf()
      this.requests = incomingRequests()
      this.friends = friendsOf()
    },
    async doSearch() {
      const r = await searchUserByPhone(this.phoneQuery)
      if (!r.ok) {
        this.searchErr = r.msg
        this.searchResult = []
        return
      }
      this.searchErr = ''
      this.searchResult = r.list
    },
    titleColor(u) {
      const t = TITLES.find((x) => x.name === u.title)
      return t ? t.color : '#64748B'
    },
    titleSoft(u) {
      const t = TITLES.find((x) => x.name === u.title)
      return t ? t.soft : '#F1F5F9'
    },
    async addFriend(u) {
      const r = requestFriend(u.id)
      uni.showToast({ title: r.msg, icon: 'none' })
      if (r.ok) {
        await this.doSearch()
        this.refresh()
      }
    },
    switchTab(t) {
      if (!this.isTap()) return
      this.tab = t
      this.refresh()
    },
    accept(r) {
      const res = respondFriend(r.id, true)
      uni.showToast({ title: res.msg, icon: 'none' })
      this.refresh()
    },
    reject(r) {
      const res = respondFriend(r.id, false)
      uni.showToast({ title: res.msg, icon: 'none' })
      this.refresh()
    },
    openProfile(id) {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/profile/profile?id=' + id })
    },
    chatWith(f) {
      if (!this.isTap()) return
      const taskId = latestTaskWith(f.id)
      uni.navigateTo({ url: `/pages/room/room?taskId=${taskId}&otherId=${f.id}` })
    },
    openRoom(c) {
      if (!this.isTap()) return
      uni.navigateTo({ url: `/pages/room/room?taskId=${c.taskId}&otherId=${c.otherId}` })
    },
    openNotice(n) {
      if (!this.isTap()) return
      if (n.taskId) {
        uni.navigateTo({ url: '/pages/detail/detail?id=' + n.taskId })
      }
    },
    readAll() {
      markAllRead()
      this.refresh()
      uni.showToast({ title: '已全部标为已读', icon: 'none' })
    },
    iconOf(type) {
      const map = {
        quote: '💰',
        selected: '🎉',
        rejected: '😅',
        deliver: '📦',
        done: '✅',
        review: '⭐',
        audit: '🛡️',
        dispute: '⚖️',
        report: '🚩',
        cancel: '🚫',
        working: '🔧',
        system: '📢'
      }
      return map[type] || '🔔'
    },
    iconBg(type) {
      const map = {
        quote: '#fff2e8',
        selected: '#e6faf6',
        deliver: '#eef1ff',
        done: '#e6faf6',
        review: '#fff2e8',
        audit: '#eef1ff',
        dispute: '#fcebeb',
        system: '#f2f4fa'
      }
      return map[type] || '#f2f4fa'
    },
    goHall() {
      uni.reLaunch({ url: '/pages/hall/hall' })
    }
  }
}
</script>

<style scoped>
.tabs {
  display: flex;
  flex-direction: row;
  padding: 0 32rpx;
  background-color: #ffffff;
}
.tab {
  font-size: 28rpx;
  color: #8b90a3;
  font-weight: 700;
  padding: 26rpx 30rpx 22rpx;
  border-bottom: 4rpx solid transparent;
}
.tab-on {
  color: #4c6fff;
  border-bottom-color: #4c6fff;
}
.tab-count {
  font-size: 19rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 2rpx 8rpx;
  border-radius: 999rpx;
  margin-left: 6rpx;
}
.list {
  padding: 24rpx 32rpx 200rpx;
}
.conv {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(76, 111, 255, 0.06);
}
.conv-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background-color: #f2f4fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 20rpx;
}
.conv-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #14161f;
}
.conv-time {
  font-size: 20rpx;
  color: #b6bac9;
}
.conv-task {
  display: block;
  font-size: 21rpx;
  color: #4c6fff;
  margin-top: 4rpx;
}
.conv-last {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  margin-top: 4rpx;
}
.notice-head {
  padding: 0 4rpx 16rpx;
}
.notice-read {
  font-size: 21rpx;
  color: #4c6fff;
}
.notice {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(76, 111, 255, 0.06);
}
.notice-unread {
  border-left: 6rpx solid #4c6fff;
}
.notice-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}
.notice-emoji {
  font-size: 32rpx;
}
.notice-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  flex: 1;
}
.notice-time {
  font-size: 19rpx;
  color: #b6bac9;
  margin-left: 12rpx;
}
.notice-body {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.5;
  margin-top: 6rpx;
}
.search-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin: 0 0 20rpx;
  box-shadow: 0 8rpx 26rpx rgba(76, 111, 255, 0.07);
}
.search-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
}
.search-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 16rpx;
}
.search-input {
  flex: 1;
  height: 76rpx;
  background-color: #f5f7fb;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #14161f;
  box-sizing: border-box;
}
.search-btn {
  height: 76rpx;
  padding: 0 30rpx;
  margin-left: 14rpx;
  border-radius: 16rpx;
  background-color: #4c6fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
.search-hint {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 12rpx;
  line-height: 1.5;
}
.search-err {
  display: block;
  font-size: 23rpx;
  color: #e0574f;
  margin-top: 14rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #f04a4a;
  margin-left: 10rpx;
  margin-top: 12rpx;
}
.group {
  margin-bottom: 26rpx;
}
.group-title {
  display: block;
  font-size: 21rpx;
  color: #8b90a3;
  margin-bottom: 14rpx;
  padding-left: 4rpx;
}
.fr {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 24rpx rgba(76, 111, 255, 0.06);
}
.fr-sub {
  font-size: 20rpx;
  color: #8b90a3;
  margin-top: 4rpx;
}
.fr-btn {
  height: 60rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  margin-left: 10rpx;
  flex-shrink: 0;
}
.fr-btn-ghost {
  background-color: #f2f4fa;
}
.fr-btn-primary {
  background-color: #4c6fff;
}
.fr-btn-text-ghost {
  font-size: 21rpx;
  font-weight: 600;
  color: #4a4f63;
}
.fr-btn-text-primary {
  font-size: 21rpx;
  font-weight: 700;
  color: #ffffff;
}
.fr-empty {
  display: block;
  font-size: 21rpx;
  color: #b6bac9;
  padding: 24rpx 0;
  text-align: center;
}
/* 手机号搜索结果卡片：整卡可点，进入对方主页 */
.ucard {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 22rpx 24rpx;
  margin-top: 16rpx;
  box-shadow: 0 10rpx 26rpx -10rpx rgba(15, 23, 42, 0.16), 0 4rpx 10rpx rgba(15, 23, 42, 0.04);
  transition: transform 180ms cubic-bezier(0, 0, 0.58, 1), box-shadow 180ms;
}
.ucard:active {
  transform: translateY(-2rpx) scale(1.005);
  box-shadow: 0 16rpx 32rpx -10rpx rgba(76, 111, 255, 0.24);
}
.ucard-main {
  margin-left: 18rpx;
  min-width: 0;
}
.ucard-name-row {
  align-items: center;
}
.ucard-name {
  font-size: 29rpx;
  font-weight: 700;
  color: #14161f;
  margin-right: 10rpx;
}
.ucard-title {
  padding: 3rpx 12rpx;
  border-radius: 999rpx;
}
.ucard-title-text {
  font-size: 18rpx;
  font-weight: 700;
}
.ucard-sub {
  font-size: 21rpx;
  color: #8b90a3;
  margin-top: 6rpx;
}
.ucard-phone {
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 2rpx;
}
.ucard-arrow {
  font-size: 34rpx;
  color: #c3c7d4;
  margin-left: 8rpx;
}
.fr-tip {
  background-color: #eef1ff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-top: 10rpx;
}
.fr-tip-text {
  font-size: 21rpx;
  color: #4c6fff;
  line-height: 1.5;
}
</style>
