<template>
  <view class="cc-page">
    <AppHeader title="我的订单" :back="true" />

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

    <!-- 委托类：我发布的 / 我接的 / 收藏 -->
    <view v-if="isTaskTab" class="list task-grid">
      <TaskCard v-for="t in list" :key="t.id" :task="t" />
      <EmptyState
        v-if="!list.length"
        :emoji="emptyEmoji"
        :title="emptyTitle"
        :desc="emptyDesc"
        action-text="去大厅看看"
        @action="goHall"
      />
    </view>

    <!-- 收到的评价 -->
    <view v-if="tab === 'reviews'" class="list">
      <view v-for="r in reviews" :key="r.id" class="card review-card">
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
      </view>
      <EmptyState v-if="!reviews.length" emoji="⭐" title="还没收到评价" desc="完成委托后，对方可以给你评价" />
    </view>

    <!-- 作品 -->
    <view v-if="tab === 'works'" class="list">
      <view v-for="p in works" :key="p.id" class="card work">
        <text class="work-title">{{ p.title }}</text>
        <text v-if="p.desc" class="work-desc">{{ p.desc }}</text>
        <view v-if="p.link" class="work-link">
          <text class="work-link-text">📎 {{ p.link }}</text>
        </view>
      </view>
      <view class="card add-work" @tap="openWork">
        <text class="add-work-text">＋ 添加作品案例</text>
      </view>
    </view>

    <!-- 申诉 -->
    <view v-if="tab === 'disputes'" class="list">
      <view v-for="d in disputes" :key="d.id" class="card">
        <view class="row between">
          <text class="work-title ellipsis flex1">{{ d.task ? d.task.title : '订单已删除' }}</text>
          <view class="pill" :style="{ backgroundColor: d.statusInfo.soft, color: d.statusInfo.color }">
            {{ d.statusInfo.name }}
          </view>
        </view>
        <text class="work-desc mt-12">申诉原因：{{ d.reason }}</text>
        <view v-if="d.reply" class="reply">
          <text class="reply-text">管理员回复：{{ d.reply }}</text>
        </view>
      </view>
      <EmptyState
        v-if="!disputes.length"
        emoji="⚖️"
        title="没有申诉记录"
        desc="遇到纠纷可以在订单详情里发起申诉"
      />
    </view>

    <!-- 添加作品 -->
    <view v-if="sheet === 'work'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">添加作品案例</text>
        <text class="label">作品标题</text>
        <input v-model="workForm.title" class="input" placeholder="例：课程结课汇报 PPT" placeholder-class="ph" />
        <text class="label mt-24">简单描述</text>
        <textarea v-model="workForm.desc" class="textarea" placeholder="做了什么、风格、成果" placeholder-class="ph" />
        <text class="label mt-24">文件或链接（选填）</text>
        <input v-model="workForm.link" class="input" placeholder="文件名或网盘链接" placeholder-class="ph" />
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-text-dark">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="saveWork">
            <text class="btn-text-white">保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import TaskCard from '../../components/TaskCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import Avatar from '../../components/Avatar.vue'
import {
  currentUser,
  guardLogin,
  listTasks,
  favoriteTasks,
  getState,
  reviewsAbout,
  portfoliosOf,
  disputesOfUser,
  addPortfolio
} from '../../utils/store.js'

export default {
  components: { AppHeader, TaskCard, EmptyState, Avatar },
  data() {
    return {
      tab: 'published',
      sheet: '',
      workForm: { title: '', desc: '', link: '' },
      tabs: [
        { key: 'published', label: '我发布的', count: 0 },
        { key: 'taken', label: '我接的', count: 0 },
        { key: 'fav', label: '收藏', count: 0 },
        { key: 'reviews', label: '收到的评价', count: 0 },
        { key: 'works', label: '作品', count: 0 },
        { key: 'disputes', label: '申诉', count: 0 }
      ]
    }
  },
  computed: {
    me() {
      return currentUser()
    },
    isTaskTab() {
      return this.tab === 'published' || this.tab === 'taken' || this.tab === 'fav'
    },
    list() {
      const uid = this.me ? this.me.id : ''
      if (this.tab === 'published') return listTasks({ publisherId: uid, audit: 'all' })
      if (this.tab === 'taken') return listTasks({ assigneeId: uid, audit: 'all' })
      return favoriteTasks()
    },
    emptyEmoji() {
      return { published: '📝', taken: '🤝', fav: '⭐' }[this.tab]
    },
    emptyTitle() {
      return {
        published: '还没发布过订单',
        taken: '还没接过订单',
        fav: '还没有收藏'
      }[this.tab]
    },
    emptyDesc() {
      return {
        published: '有需要帮忙的事，发一条试试',
        taken: '去大厅看看，顺手帮个忙还能涨信誉分',
        fav: '看到感兴趣的订单可以收藏起来'
      }[this.tab]
    },
    reviews() {
      return reviewsAbout(this.me ? this.me.id : '')
    },
    works() {
      return portfoliosOf(this.me ? this.me.id : '')
    },
    disputes() {
      return disputesOfUser(this.me ? this.me.id : '')
    }
  },
  onLoad() {
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
      const uid = this.me ? this.me.id : ''
      const s = getState()
      this.tabs = [
        { key: 'published', label: '我发布的', count: s.tasks.filter((t) => t.publisherId === uid).length },
        { key: 'taken', label: '我接的', count: s.tasks.filter((t) => t.assigneeId === uid).length },
        { key: 'fav', label: '收藏', count: favoriteTasks().length },
        { key: 'reviews', label: '收到的评价', count: this.reviews.length },
        { key: 'works', label: '作品', count: this.works.length },
        { key: 'disputes', label: '申诉', count: this.disputes.length }
      ]
    },
    starText(n) {
      return '★'.repeat(n) + '☆'.repeat(5 - n)
    },
    openWork() {
      this.workForm = { title: '', desc: '', link: '' }
      this.sheet = 'work'
    },
    saveWork() {
      const r = addPortfolio(this.workForm)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.sheet = ''
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    },
    closeSheet() {
      this.sheet = ''
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
  padding: 0 16rpx;
  background-color: #ffffff;
  overflow-x: auto;
  white-space: nowrap;
}
.tab {
  flex: 0 0 auto;
  text-align: center;
  font-size: 26rpx;
  color: #8b90a3;
  font-weight: 600;
  padding: 26rpx 20rpx 22rpx;
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
  padding: 24rpx 32rpx 60rpx;
}
.review-card {
  margin-bottom: 16rpx;
}
.rv-name {
  font-size: 25rpx;
  font-weight: 600;
  color: #14161f;
  margin-left: 10rpx;
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
.add-work {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #d8dcea;
  box-shadow: none;
  background-color: transparent;
  margin-top: 16rpx;
}
.add-work-text {
  font-size: 24rpx;
  color: #8b90a3;
}
.reply {
  margin-top: 14rpx;
  background-color: #e6faf6;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}
.reply-text {
  font-size: 22rpx;
  color: #17977f;
  line-height: 1.5;
}
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(20, 22, 31, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background-color: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  padding: 36rpx 32rpx;
  padding-bottom: calc(36rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #14161f;
  margin-bottom: 24rpx;
}
.label {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 12rpx;
}
.input {
  height: 84rpx;
  line-height: 84rpx;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 0 22rpx;
  font-size: 27rpx;
  color: #14161f;
  box-sizing: border-box;
}
.textarea {
  width: 100%;
  height: 150rpx;
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
</style>
