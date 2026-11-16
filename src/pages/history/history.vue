<template>
  <view class="cc-page">
    <AppHeader title="浏览记录">
      <template #right>
        <text v-if="list.length" class="clear-btn" @tap="clearAll">清空</text>
      </template>
    </AppHeader>

    <view class="body">
      <view class="list task-grid">
        <TaskCard v-for="t in list" :key="t.id" :task="t" />
        <EmptyState
          v-if="!list.length"
          emoji="🕘"
          title="还没有浏览记录"
          desc="点开看过的委托会按时间倒序出现在这里"
        />
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import TaskCard from '../../components/TaskCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { guardLogin, viewedTasks, clearViewedTasks } from '../../utils/store.js'

export default {
  components: { AppHeader, TaskCard, EmptyState },
  data() {
    return { list: [] }
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
      this.list = viewedTasks()
    },
    clearAll() {
      uni.showModal({
        title: '清空浏览记录',
        content: '确定清空全部浏览记录？',
        confirmText: '清空',
        confirmColor: '#F04A4A',
        success: (res) => {
          if (!res.confirm) return
          clearViewedTasks()
          this.load()
          uni.showToast({ title: '已清空', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.body {
  padding: 24rpx 32rpx 120rpx;
}
.clear-btn {
  font-size: 24rpx;
  font-weight: 600;
  color: #4c6fff;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background-color: #eef1ff;
}
</style>
