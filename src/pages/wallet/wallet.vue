<template>
  <view class="cc-page">
    <AppHeader title="我的钱包" :back="true" />

    <view class="body">
      <view class="card">
        <view class="row between">
          <text class="section-title mb-0">我的钱包</text>
          <text class="wallet-hint">线下结算 · 平台仅记账</text>
        </view>

        <view class="wallet-row">
          <view class="w-item">
            <text class="w-num income">¥{{ wallet.income }}</text>
            <text class="w-label">累计收入</text>
          </view>
          <view class="w-item">
            <text class="w-num expense">¥{{ wallet.expense }}</text>
            <text class="w-label">累计支出</text>
          </view>
          <view class="w-item">
            <text class="w-num">¥{{ wallet.net }}</text>
            <text class="w-label">净收入</text>
          </view>
        </view>

        <view class="ledger">
          <text class="ledger-title">收入来源（{{ wallet.count }} 笔）</text>
          <view v-for="r in shownRecords" :key="r.id" class="lg">
            <view class="lg-icon" :class="r.type === 'income' ? 'lg-in' : 'lg-out'">
              <text class="lg-icon-text">{{ r.type === 'income' ? '↓' : '↑' }}</text>
            </view>
            <view class="col flex1">
              <text class="lg-title ellipsis">{{ r.taskTitle }}</text>
              <text class="lg-time">{{ r.dateLabel }} · {{ r.type === 'income' ? '接单收入' : '发单支出' }}</text>
            </view>
            <text class="lg-amt" :class="r.type === 'income' ? 'income' : 'expense'">
              {{ r.type === 'income' ? '+' : '-' }}{{ r.amount }}
            </text>
          </view>
          <view v-if="wallet.records.length > 5" class="lg-more" @tap="showAllLedger = !showAllLedger">
            <text class="lg-more-text">
              {{ showAllLedger ? '收起' : '查看全部 ' + wallet.records.length + ' 笔' }}
            </text>
          </view>
          <text v-if="!wallet.records.length" class="lg-empty">还没有收入记录，接一单试试</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import { currentUser, guardLogin, walletOf } from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      showAllLedger: false
    }
  },
  computed: {
    me() {
      return currentUser()
    },
    wallet() {
      return walletOf(this.me ? this.me.id : '')
    },
    shownRecords() {
      return this.showAllLedger ? this.wallet.records : this.wallet.records.slice(0, 5)
    }
  },
  onLoad() {
    guardLogin()
  }
}
</script>

<style scoped>
.body {
  padding: 24rpx 32rpx 40rpx;
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
.mb-0 {
  margin-bottom: 0;
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
}
</style>
