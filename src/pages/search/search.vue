<template>
  <view class="cc-page search-page">
    <!-- 顶部搜索栏 -->
    <view class="sbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sbar-inner">
        <text class="sbar-back" @tap="goBack">‹</text>
        <view class="sbar-input-wrap">
          <text class="sbar-ico">🔍</text>
          <input
            ref="kwInput"
            v-model="keyword"
            class="sbar-input"
            :focus="autoFocus"
            placeholder="搜索委托：标题、地点、要求…"
            placeholder-class="ph"
            confirm-type="search"
            @confirm="doSearch"
          />
          <text v-if="keyword" class="sbar-clear" @tap="keyword = ''">✕</text>
        </view>
        <text class="sbar-btn" @tap="doSearch">搜索</text>
      </view>
    </view>

    <!-- 未搜索：热门 + 历史 -->
    <view v-if="!searched" class="panel">
      <view v-if="history.length" class="block">
        <view class="block-head">
          <text class="block-title">搜索历史</text>
          <text class="block-clear" @tap="clearHistory">清空</text>
        </view>
        <view class="chips">
          <text v-for="(h, i) in history" :key="'h' + i" class="chip" @tap="pick(h)">{{ h }}</text>
        </view>
      </view>

      <view class="block">
        <view class="block-head">
          <text class="block-title">热门搜索</text>
        </view>
        <view class="hot-list">
          <view v-for="(h, i) in hot" :key="'hot' + i" class="hot" @tap="pick(h)">
            <text class="hot-rank" :class="{ 'hot-rank-top': i < 3 }">{{ i + 1 }}</text>
            <text class="hot-text">{{ h }}</text>
          </view>
        </view>
      </view>

      <view class="block">
        <view class="block-head">
          <text class="block-title">按分类找</text>
        </view>
        <view class="chips">
          <text v-for="c in categories" :key="c.key" class="chip chip-cat" @tap="pick(c.name)">
            {{ c.emoji }} {{ c.name }}
          </text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="panel">
      <view class="result-head">
        <text class="result-count">「{{ lastQuery }}」找到 {{ results.length }} 条委托</text>
      </view>

      <view v-for="t in results" :key="t.id" class="rcard" @tap="openTask(t)">
        <view class="rcard-top">
          <text class="rcard-cat">{{ t.cat.emoji }} {{ t.cat.name }}</text>
          <text class="rcard-status" :style="{ color: statusColor(t) }">{{ statusText(t) }}</text>
        </view>
        <text class="rcard-title">{{ t.title }}</text>
        <text class="rcard-desc ellipsis">{{ t.desc }}</text>
        <view class="rcard-foot">
          <text class="rcard-meta">{{ t.place }} · {{ t.deadlineLabel }}</text>
          <text class="rcard-price">{{ t.budgetLabel }}</text>
        </view>
      </view>

      <EmptyState
        v-if="!results.length"
        emoji="🔍"
        title="没有找到相关委托"
        desc="换个关键词试试，也可以自己发一条"
        action-text="去发布委托"
        @action="goPublish"
      />
    </view>
  </view>
</template>

<script>
import EmptyState from '../../components/EmptyState.vue'
import { listTasks, listCategories, guardLogin } from '../../utils/store.js'

const HISTORY_KEY = 'cc_search_history_v1'

export default {
  components: { EmptyState },
  data() {
    return {
      statusBarHeight: 0,
      autoFocus: true,
      keyword: '',
      lastQuery: '',
      searched: false,
      results: [],
      history: [],
      categories: [],
      hot: ['代取快递', '奶茶', 'PPT 美化', '高数辅导', '毕业照跟拍', '搬东西']
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
    this.categories = listCategories()
    this.loadHistory()
    // 从别处带关键词进来直接搜
    const kw = options && options.keyword ? decodeURIComponent(options.keyword) : ''
    if (kw) {
      this.keyword = kw
      this.doSearch()
    }
  },
  methods: {
    loadHistory() {
      try {
        const h = uni.getStorageSync(HISTORY_KEY)
        this.history = Array.isArray(h) ? h.slice(0, 10) : []
      } catch (e) {
        this.history = []
      }
    },
    saveHistory(kw) {
      const k = String(kw || '').trim()
      if (!k) return
      const list = [k].concat(this.history.filter((x) => x !== k)).slice(0, 10)
      this.history = list
      try {
        uni.setStorageSync(HISTORY_KEY, list)
      } catch (e) {
        /* 忽略 */
      }
    },
    clearHistory() {
      this.history = []
      try {
        uni.removeStorageSync(HISTORY_KEY)
      } catch (e) {
        /* 忽略 */
      }
    },
    pick(kw) {
      this.keyword = kw
      this.doSearch()
    },
    doSearch() {
      const k = String(this.keyword || '').trim()
      if (!k) {
        uni.showToast({ title: '输入点什么再搜索吧', icon: 'none' })
        return
      }
      this.lastQuery = k
      this.searched = true
      this.saveHistory(k)
      this.results = listTasks({ keyword: k, audit: 'approved', sort: 'smart' })
    },
    openTask(t) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + t.id })
    },
    goPublish() {
      uni.navigateTo({ url: '/pages/publish/publish' })
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack({ delta: 1 })
      else uni.reLaunch({ url: '/pages/hall/hall' })
    },
    statusText(t) {
      if (t.expired) return '已流单'
      const map = {
        pending: '待接单',
        assigned: '已接单',
        working: '进行中',
        submitted: '待验收',
        done: '已完成',
        cancelled: '已取消'
      }
      return map[t.status] || '待接单'
    },
    statusColor(t) {
      if (t.expired) return '#DC2626'
      const map = {
        pending: '#2563EB',
        assigned: '#D97706',
        working: '#D97706',
        submitted: '#7C3AED',
        done: '#059669',
        cancelled: '#94A3B8'
      }
      return map[t.status] || '#64748B'
    }
  }
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background-color: #f5f7fb;
}
.sbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: #ffffff;
  border-bottom: 2rpx solid #eef1f7;
}
.sbar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 96rpx;
  padding: 0 20rpx 0 8rpx;
  box-sizing: border-box;
}
.sbar-back {
  width: 60rpx;
  font-size: 46rpx;
  color: #14161f;
  text-align: center;
  line-height: 46rpx;
  margin-top: -6rpx;
}
.sbar-input-wrap {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 72rpx;
  background-color: #f3f5fa;
  border-radius: 999rpx;
  padding: 0 18rpx;
  margin: 0 12rpx;
  box-sizing: border-box;
}
.sbar-ico {
  font-size: 26rpx;
  margin-right: 8rpx;
}
.sbar-input {
  flex: 1;
  font-size: 28rpx;
  color: #14161f;
}
.ph {
  color: #9aa0b4;
  font-size: 26rpx;
}
.sbar-clear {
  font-size: 24rpx;
  color: #9aa0b4;
  padding: 0 8rpx;
}
.sbar-btn {
  font-size: 28rpx;
  font-weight: 700;
  color: #4c6fff;
  padding: 0 8rpx;
  white-space: nowrap;
}
.panel {
  padding: 24rpx 32rpx 60rpx;
}
.block {
  margin-bottom: 36rpx;
}
.block-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}
.block-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #14161f;
}
.block-clear {
  font-size: 22rpx;
  color: #9aa0b4;
}
.chips {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.chip {
  font-size: 24rpx;
  color: #4a4f63;
  background-color: #ffffff;
  border: 2rpx solid #eceff6;
  border-radius: 999rpx;
  padding: 12rpx 22rpx;
  margin-right: 14rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.04);
}
.chip:active {
  background-color: #eef1ff;
  border-color: #c9d5ff;
}
.chip-cat {
  color: #4c6fff;
  font-weight: 600;
}
.hot-list {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 6rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.05);
}
.hot {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 2rpx solid #f3f5fa;
}
.hot:last-child {
  border-bottom: none;
}
.hot-rank {
  width: 40rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: #b6bac9;
  text-align: center;
  margin-right: 14rpx;
}
.hot-rank-top {
  color: #ff8a3d;
}
.hot-text {
  font-size: 27rpx;
  color: #14161f;
}
.result-head {
  padding: 4rpx 4rpx 18rpx;
}
.result-count {
  font-size: 23rpx;
  color: #8b90a3;
}
.rcard {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 26rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.055);
  transition: transform 220ms cubic-bezier(0, 0, 0.58, 1), box-shadow 220ms cubic-bezier(0, 0, 0.58, 1);
}
.rcard:active {
  transform: translateY(-3rpx) scale(1.01);
  box-shadow: 0 16rpx 34rpx rgba(37, 99, 235, 0.14);
}
.rcard-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.rcard-cat {
  font-size: 21rpx;
  color: #8b90a3;
}
.rcard-status {
  font-size: 21rpx;
  font-weight: 700;
}
.rcard-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #14161f;
  margin-top: 8rpx;
}
.rcard-desc {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  margin-top: 6rpx;
}
.rcard-foot {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 2rpx solid #f3f5fa;
}
.rcard-meta {
  font-size: 21rpx;
  color: #8b90a3;
}
.rcard-price {
  font-size: 30rpx;
  font-weight: 800;
  color: #ff8a3d;
}
</style>
