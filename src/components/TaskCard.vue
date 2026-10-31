<template>
  <view class="tc" :class="{ 'tc-dim': dimmed }" @tap="open">
    <!-- 左侧类型色条：让类型可扫视 -->
    <view class="tc-bar" :style="{ backgroundColor: task.cat.color }"></view>

    <!-- 状态：小圆点 + 文字（全卡只出现一次） -->
    <view class="tc-status-row">
      <view class="tc-status-dot" :style="{ backgroundColor: statusView.color }"></view>
      <text class="tc-status" :style="{ color: statusView.color }">{{ statusView.text }}</text>
      <text v-if="task.urgent && task.status === 'pending' && !task.expired" class="tc-flag">加急</text>
      <text v-if="showAudit && task.audit !== 'approved'" class="tc-flag tc-flag-warn">{{ task.au.name }}</text>
      <text class="tc-cat">{{ task.cat.emoji }} {{ task.cat.name }}</text>
    </view>

    <text class="tc-title">{{ task.title }}</text>
    <text class="tc-desc">{{ task.desc }}</text>

    <view class="tc-meta">
      <text class="tc-meta-item">📍 {{ task.place }}</text>
      <text class="tc-sep">·</text>
      <text class="tc-time" :style="{ color: deadlineView.color }">⏰ {{ deadlineView.text }}</text>
    </view>

    <view class="tc-foot">
      <view class="tc-user">
        <Avatar :value="task.anonymous ? '🎭' : (task.publisher ? task.publisher.avatar : '🙂')" :size="44" />
        <!-- 已接单：把接单人头像也摆出来，一眼看出谁在做 -->
        <template v-if="task.assignee">
          <text class="tc-arrow">→</text>
          <Avatar :value="task.assignee.avatar" :size="44" />
        </template>
        <text class="tc-name">
          {{ task.publisherName }}<text v-if="task.assignee" class="tc-taker"> · {{ task.assigneeName }} 接</text>
        </text>
        <text v-if="!task.anonymous && task.publisher" class="tc-credit">信誉 {{ task.publisher.credit }}</text>
      </view>

      <view class="tc-pay">
        <text v-if="task.itemPrice" class="tc-item">商品 ¥{{ task.itemPrice }}</text>
        <text class="tc-reward">{{ task.budgetLabel }}</text>
      </view>

      <!-- 唯一主按钮：全卡唯一的实心色块 -->
      <view v-if="action" class="tc-cta" @tap.stop="onAction">
        <text class="tc-cta-text">{{ action.label }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import Avatar from './Avatar.vue'
import { currentUser } from '../utils/store.js'

export default {
  name: 'TaskCard',
  components: { Avatar },
  props: {
    task: { type: Object, required: true },
    showAudit: { type: Boolean, default: false }
  },
  computed: {
    me() {
      return currentUser()
    },
    dimmed() {
      return this.task.expired || this.task.status === 'done' || this.task.status === 'cancelled'
    },
    statusView() {
      const t = this.task
      if (t.expired) return { text: '已流单', color: '#DC2626' }
      const map = {
        pending: { text: '待接单', color: '#2563EB' },
        assigned: { text: '已接单', color: '#D97706' },
        working: { text: '进行中', color: '#D97706' },
        submitted: { text: '待验收', color: '#7C3AED' },
        done: { text: '已完成', color: '#059669' },
        cancelled: { text: '已取消', color: '#94A3B8' }
      }
      return map[t.status] || { text: t.st.name, color: '#64748B' }
    },
    // 截止时间三档：<30min 橙、<24h 中性、>24h 灰、已过期红
    deadlineView() {
      const ts = Number(this.task.deadline) || 0
      if (!ts) return { text: this.task.deadlineLabel, color: '#94A3B8' }
      const diff = ts - Date.now()
      const d = new Date(ts)
      const pad = (n) => (n < 10 ? '0' + n : String(n))
      const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
      if (diff <= 0) return { text: '已截止', color: '#DC2626' }
      if (diff < 30 * 60 * 1000) {
        return { text: '剩 ' + Math.max(1, Math.round(diff / 60000)) + ' 分钟', color: '#D97706' }
      }
      if (diff < 24 * 3600 * 1000) return { text: '今天 ' + hm, color: '#64748B' }
      return { text: d.getMonth() + 1 + '月' + d.getDate() + '日 ' + hm, color: '#94A3B8' }
    },
    action() {
      const t = this.task
      if (t.audit !== 'approved') return null
      if (t.expired) return null
      const uid = this.me ? this.me.id : ''
      const mine = t.publisherId === uid
      const iTake = t.assigneeId === uid

      if (t.status === 'pending') {
        if (mine) return null
        return { label: '立即接单', type: 'take' }
      }
      if (t.status === 'assigned') return iTake ? { label: '开始处理', type: 'go' } : null
      if (t.status === 'working') return iTake ? { label: '提交交付', type: 'go' } : null
      if (t.status === 'submitted') return mine ? { label: '去验收', type: 'go' } : null
      return null
    }
  },
  methods: {
    open() {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + this.task.id })
    },
    onAction() {
      const a = this.action
      if (!a) return
      const suffix = a.type === 'take' ? '&take=1' : ''
      uni.navigateTo({ url: '/pages/detail/detail?id=' + this.task.id + suffix })
    }
  }
}
</script>

<style scoped>
.tc {
  position: relative;
  background-color: #ffffff;
  border: 2rpx solid rgba(226, 232, 240, 0.9);
  border-radius: 24rpx;
  padding: 28rpx 28rpx 24rpx 32rpx;
  margin-bottom: 28rpx;
  overflow: hidden;
  box-sizing: border-box;
  /* 边缘立体化：柔和离背投影（参数克制），让卡片独立于背景、彼此区分更明显 */
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.055);
  transition: transform 280ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 280ms cubic-bezier(0, 0, 0.58, 1),
    border-color 280ms cubic-bezier(0, 0, 0.58, 1);
}
.tc-dim {
  opacity: 0.72;
}
.tc-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
}
@media (hover: hover) {
  .tc:hover {
    transform: translateY(-6rpx) scale(1.012);
    border-color: #BFDBFE;
    box-shadow: 0 20rpx 44rpx rgba(37, 99, 235, 0.16);
  }
}
.tc:active {
  transform: translateY(-3rpx) scale(1.01);
  box-shadow: 0 14rpx 32rpx rgba(37, 99, 235, 0.13);
}

/* 状态行 */
.tc-status-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}
.tc-status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}
.tc-status {
  font-size: 22rpx;
  font-weight: 700;
}
.tc-flag {
  margin-left: 10rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #D97706;
  background-color: #FFFBEB;
  border: 2rpx solid #FDE68A;
  border-radius: 12rpx;
  padding: 2rpx 10rpx;
}
.tc-flag-warn {
  color: #B45309;
  background-color: #FFF7ED;
  border-color: #FED7AA;
}
.tc-cat {
  margin-left: auto;
  font-size: 22rpx;
  color: #64748B;
}

/* 正文 */
.tc-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #0F172A;
  line-height: 1.42;
  letter-spacing: -0.2rpx;
}
.tc-desc {
  display: -webkit-box;
  font-size: 26rpx;
  color: #64748B;
  line-height: 1.55;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.tc-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 14rpx;
  flex-wrap: wrap;
}
.tc-meta-item {
  font-size: 22rpx;
  color: #64748B;
}
.tc-sep {
  font-size: 22rpx;
  color: #CBD5E1;
  margin: 0 10rpx;
}
.tc-time {
  font-size: 22rpx;
  font-weight: 600;
}

/* 底部：作者 + 价格 + 主按钮 */
.tc-foot {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 2rpx solid #F1F5F9;
}
.tc-user {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.tc-name {
  font-size: 24rpx;
  color: #334155;
  font-weight: 600;
  margin-left: 10rpx;
  margin-right: 10rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180rpx;
}
.tc-arrow {
  font-size: 22rpx;
  color: #94A3B8;
  margin-left: 8rpx;
  margin-right: 8rpx;
}
.tc-taker {
  font-size: 22rpx;
  color: #64748B;
  font-weight: 500;
}
.tc-credit {
  font-size: 20rpx;
  color: #64748B;
  background-color: #F1F5F9;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}
.tc-pay {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.tc-item {
  font-size: 20rpx;
  color: #475569;
  background-color: #F1F5F9;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-right: 12rpx;
}
.tc-reward {
  font-size: 32rpx;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.4rpx;
}

.tc-cta {
  margin-left: 16rpx;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 12rpx;
  background-color: #2563EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tc-cta-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
