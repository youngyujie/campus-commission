<template>
  <view class="cc-page room-page">
    <view class="room-hdr">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="room-hdr-bar">
        <text class="room-back" @tap="goBack">‹</text>
        <view class="col flex1" @tap="goProfile">
          <text class="room-title">{{ other ? other.nickname || other.name : '聊天' }}</text>
          <text class="room-sub ellipsis">{{ task ? task.title : '' }}</text>
        </view>
        <text class="room-more" @tap="goTask">详情</text>
      </view>
    </view>

    <!-- 聊天权限横幅 -->
    <view v-if="!perm.friend" class="temp-bar" :class="{ 'temp-bar-out': !perm.ok }">
      <view class="col flex1">
        <text class="temp-title">{{ perm.ok ? '临时聊天中' : '临时聊天已结束' }}</text>
        <text class="temp-sub">
          {{ perm.ok ? '还可发送 ' + perm.remaining + ' / ' + perm.limit + ' 句，添加好友后不限' : '已聊满 ' + perm.limit + ' 句，添加好友后可继续' }}
        </text>
      </view>
      <view class="temp-btn" @tap="onAddFriend">
        <text class="temp-btn-text">{{ friendLabel }}</text>
      </view>
    </view>
    <view v-else class="friend-bar">
      <text class="friend-bar-text">已是好友 · 不限聊天次数</text>
    </view>

    <scroll-view class="msgs" scroll-y :scroll-into-view="scrollTo" :scroll-with-animation="true">
      <view v-if="task" class="tip">
        <text class="tip-text">关于「{{ task.title }}」· {{ task.st.name }}</text>
      </view>

      <view v-for="m in msgs" :key="m.id" :id="'m' + m.id" class="msg" :class="{ 'msg-mine': m.mine }">
        <Avatar v-if="!m.mine" :value="other ? other.avatar : '🙂'" :size="68" />
        <view class="col msg-body">
          <view class="bubble" :class="{ 'bubble-mine': m.mine }">
            <image v-if="m.image" class="msg-img" :src="m.image" mode="widthFix" />
            <text v-if="m.text" class="msg-text" :class="{ 'msg-text-mine': m.mine }">{{ m.text }}</text>
          </view>
          <text class="msg-time">{{ m.timeLabel }}</text>
        </view>
        <Avatar v-if="m.mine" :value="me ? me.avatar : '🙂'" :size="68" />
      </view>

      <view v-if="!msgs.length" class="empty">
        <text class="empty-emoji">💬</text>
        <text class="empty-text">还没有聊天记录，打个招呼吧</text>
      </view>

      <view id="bottom" class="msgs-bottom"></view>
    </scroll-view>

    <view v-if="perm.ok" class="quick">
      <text v-for="(q, i) in quickReplies" :key="i" class="quick-item" @tap="sendQuick(q)">{{ q }}</text>
    </view>

    <view v-if="perm.ok" class="inputbar">
      <text class="input-img" @tap="pickImage">🖼️</text>
      <input
        v-model="draft"
        class="input"
        placeholder="说点什么…"
        placeholder-class="ph"
        confirm-type="send"
        @confirm="send"
      />
      <view class="send-btn" :class="{ 'send-btn-on': draft.trim() }" @tap="send">
        <text class="send-text">发送</text>
      </view>
    </view>

    <view v-else class="locked">
      <text class="locked-text">临时聊天已用完，添加好友后可继续聊天</text>
      <view class="locked-btn" @tap="onAddFriend">
        <text class="locked-btn-text">{{ friendLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import Avatar from '../../components/Avatar.vue'
import {
  currentUser,
  guardLogin,
  getUser,
  getTask,
  messagesWith,
  sendMessage,
  chatPermission,
  friendState,
  requestFriend,
  respondFriend
} from '../../utils/store.js'
import { pickImage as pickImageFile, toDataUrl, MAX_IMAGE_DATA_LEN } from '../../utils/file.js'

export default {
  components: { Avatar },
  data() {
    return {
      statusBarHeight: 0,
      taskId: '',
      otherId: '',
      draft: '',
      msgs: [],
      scrollTo: '',
      permTick: 0,
      quickReplies: ['你好，我看到你的委托了', '方便什么时候交付？', '已经完成了，你看下', '收到，谢谢！']
    }
  },
  computed: {
    me() {
      return currentUser()
    },
    other() {
      return getUser(this.otherId)
    },
    task() {
      return getTask(this.taskId)
    },
    perm() {
      if (!(this.permTick >= 0) || !this.otherId) {
        return { ok: false, friend: false, remaining: 0, limit: 10 }
      }
      return chatPermission(this.otherId)
    },
    friendLabel() {
      if (!this.me) return '加好友'
      const st = friendState(this.me.id, this.otherId).status
      if (st === 'friend') return '已是好友'
      if (st === 'requested') return '已申请'
      if (st === 'incoming') return '同意申请'
      return '加好友'
    }
  },
  onLoad(options) {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
    if (!guardLogin()) return
    this.taskId = options.taskId || ''
    this.otherId = options.otherId || ''
    this.load()
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      this.msgs = messagesWith(this.otherId)
      this.$nextTick(() => this.toBottom())
    },
    toBottom() {
      const last = this.msgs[this.msgs.length - 1]
      this.scrollTo = last ? 'm' + last.id : 'bottom'
    },
    send() {
      const text = this.draft.trim()
      if (!text) return
      const r = sendMessage({ toId: this.otherId, text })
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        this.permTick++
        return
      }
      this.draft = ''
      this.permTick++
      this.load()
    },
    sendQuick(q) {
      const r = sendMessage({ toId: this.otherId, text: q })
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        this.permTick++
        return
      }
      this.permTick++
      this.load()
    },
    onAddFriend() {
      if (!this.me) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const info = friendState(this.me.id, this.otherId)
      if (info.status === 'friend') {
        uni.showToast({ title: '你们已经是好友了', icon: 'none' })
        return
      }
      if (info.status === 'requested') {
        uni.showToast({ title: '已发送申请，等对方同意', icon: 'none' })
        return
      }
      if (info.status === 'incoming') {
        const r = respondFriend(info.row.id, true)
        uni.showToast({ title: r.msg, icon: 'none' })
        this.permTick++
        this.load()
        return
      }
      const r = requestFriend(this.otherId)
      uni.showToast({ title: r.msg, icon: 'none' })
      this.permTick++
    },
    async pickImage() {
      const f = await pickImageFile()
      if (!f) return
      uni.showLoading({ title: '处理中' })
      const data = await toDataUrl(f.path)
      uni.hideLoading()
      if (!data) {
        uni.showToast({ title: '读取图片失败', icon: 'none' })
        return
      }
      if (data.length > MAX_IMAGE_DATA_LEN) {
        uni.showToast({ title: '图片太大，换一张小一点的', icon: 'none' })
        return
      }
      const r = sendMessage({ toId: this.otherId, text: '', image: data })
      if (r.ok) this.load()
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack({ delta: 1 })
      else uni.reLaunch({ url: '/pages/chat/chat' })
    },
    goTask() {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + this.taskId })
    },
    goProfile() {
      if (!this.otherId) return
      uni.navigateTo({ url: '/pages/profile/profile?id=' + this.otherId })
    }
  }
}
</script>

<style scoped>
.room-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
}
.room-hdr {
  background-color: #ffffff;
  border-bottom: 2rpx solid #edeff6;
  flex-shrink: 0;
}
.room-hdr-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
}
.room-back {
  font-size: 46rpx;
  color: #14161f;
  width: 56rpx;
  line-height: 46rpx;
  margin-top: -6rpx;
}
.room-title {
  font-size: 29rpx;
  font-weight: 700;
  color: #14161f;
  text-align: center;
}
.room-sub {
  font-size: 19rpx;
  color: #8b90a3;
  text-align: center;
  margin-top: 2rpx;
}
.room-more {
  font-size: 23rpx;
  color: #4c6fff;
  padding: 8rpx 4rpx;
}
.msgs {
  flex: 1;
  padding: 20rpx 28rpx 0;
  box-sizing: border-box;
  overflow: hidden;
}
.tip {
  text-align: center;
  margin-bottom: 24rpx;
}
.tip-text {
  font-size: 19rpx;
  color: #b6bac9;
  background-color: #eef0f6;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
}
.msg {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 24rpx;
}
.msg-mine {
  justify-content: flex-end;
}
.msg-avatar {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background-color: #f2f4fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}
.msg-body {
  max-width: 460rpx;
  margin: 0 14rpx;
}
.msg-mine .msg-body {
  align-items: flex-end;
}
.bubble {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 18rpx 22rpx;
  box-shadow: 0 4rpx 14rpx rgba(20, 22, 31, 0.05);
}
.bubble-mine {
  background-color: #4c6fff;
}
.msg-text {
  font-size: 26rpx;
  color: #14161f;
  line-height: 1.55;
}
.msg-text-mine {
  color: #ffffff;
}
.msg-img {
  width: 300rpx;
  border-radius: 12rpx;
}
.msg-time {
  font-size: 18rpx;
  color: #c3c7d4;
  margin-top: 6rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-emoji {
  font-size: 64rpx;
}
.empty-text {
  font-size: 23rpx;
  color: #b6bac9;
  margin-top: 16rpx;
}
.msgs-bottom {
  height: 20rpx;
}
.quick {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0 28rpx 12rpx;
  flex-shrink: 0;
}
.quick-item {
  font-size: 20rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
.inputbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-top: 2rpx solid #edeff6;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.input-img {
  font-size: 34rpx;
  margin-right: 14rpx;
}
.input {
  flex: 1;
  height: 76rpx;
  background-color: #f5f7fb;
  border-radius: 999rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #14161f;
  box-sizing: border-box;
}
.ph {
  color: #b6bac9;
  font-size: 25rpx;
}
.send-btn {
  margin-left: 14rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background-color: #e9ebf2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.send-btn-on {
  background-color: #4c6fff;
}
.send-text {
  font-size: 25rpx;
  font-weight: 700;
  color: #b6bac9;
}
.send-btn-on .send-text {
  color: #ffffff;
}
.temp-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #fff8ee;
  padding: 16rpx 24rpx;
  flex-shrink: 0;
}
.temp-bar-out {
  background-color: #fcebeb;
}
.temp-title {
  font-size: 23rpx;
  font-weight: 700;
  color: #a8621f;
}
.temp-bar-out .temp-title {
  color: #a32d2d;
}
.temp-sub {
  font-size: 19rpx;
  color: #c08a52;
  margin-top: 3rpx;
}
.temp-bar-out .temp-sub {
  color: #c06060;
}
.temp-btn {
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background-color: #ff8a3d;
  display: flex;
  align-items: center;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.temp-bar-out .temp-btn {
  background-color: #f04a4a;
}
.temp-btn-text {
  font-size: 21rpx;
  font-weight: 700;
  color: #ffffff;
}
.friend-bar {
  background-color: #e6faf6;
  padding: 12rpx 24rpx;
  flex-shrink: 0;
}
.friend-bar-text {
  font-size: 19rpx;
  color: #17977f;
}
.locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #ffffff;
  border-top: 2rpx solid #edeff6;
  padding: 28rpx 32rpx;
  padding-bottom: calc(28rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.locked-text {
  font-size: 22rpx;
  color: #8b90a3;
}
.locked-btn {
  margin-top: 18rpx;
  height: 80rpx;
  padding: 0 60rpx;
  border-radius: 999rpx;
  background-color: #4c6fff;
  display: flex;
  align-items: center;
}
.locked-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
