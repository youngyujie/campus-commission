<template>
  <view class="cc-page">
    <AppHeader title="平台规则" />

    <view class="body">
      <view class="intro">
        <text class="intro-title">校园委托 · 平台规则</text>
        <text class="intro-text">仅限本校学生使用。发布委托前请先读完下面的规则，违规内容会被审核驳回，累计两次封号。</text>
      </view>

      <!-- 公告 -->
      <view v-if="announcements.length" class="card">
        <text class="section-title">📢 平台公告</text>
        <view v-for="a in announcements" :key="a.id" class="ann">
          <view class="row between">
            <text class="ann-title ellipsis flex1">{{ a.title }}</text>
            <text class="ann-time">{{ a.timeLabel }}</text>
          </view>
          <text class="ann-body">{{ a.body }}</text>
        </view>
      </view>

      <!-- 规则 -->
      <view v-for="(r, i) in rules" :key="i" class="card">
        <view class="row">
          <view class="rule-index">
            <text class="rule-index-text">{{ i + 1 }}</text>
          </view>
          <text class="rule-title">{{ r.title }}</text>
        </view>
        <view class="items">
          <view v-for="(it, j) in r.items" :key="j" class="item">
            <text class="item-dot">·</text>
            <text class="item-text">{{ it }}</text>
          </view>
        </view>
      </view>

      <!-- 帮助 -->
      <view class="card">
        <text class="section-title">🙋 常见问题</text>
        <view v-for="(f, i) in faq" :key="i" class="faq" @tap="toggleFaq(i)">
          <view class="row between">
            <text class="faq-q flex1">{{ f.q }}</text>
            <text class="faq-arrow">{{ openFaq === i ? '−' : '+' }}</text>
          </view>
          <text v-if="openFaq === i" class="faq-a">{{ f.a }}</text>
        </view>
      </view>

      <view class="footer">
        <text class="footer-text">校园委托 · 仅限本校学生 · 平台不经手资金</text>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import { RULES } from '../../utils/constants.js'
import { listAnnouncements } from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      rules: RULES,
      announcements: [],
      openFaq: -1,
      faq: [
        {
          q: '报酬怎么结算？平台会收钱吗？',
          a: '平台不碰资金。委托完成验收后，报酬由双方线下自行结算（微信 / 支付宝）。平台只记录订单金额与流程，用于信用和纠纷取证。'
        },
        {
          q: '为什么我的委托显示「待审核」？',
          a: '所有委托发布后先由管理员审核，确认没有违规内容才会出现在大厅。一般几分钟内处理完，审核通过会给你发通知。'
        },
        {
          q: '报价之后多久能被选中？',
          a: '由委托人自己挑选。你可以同时给多条委托报价，被选中后会收到通知，其他报价会自动落选。'
        },
        {
          q: '信誉分低了会怎样？',
          a: '低于 60 分会被限制发单和接单。多完成委托、拿到好评就能涨回来。'
        },
        {
          q: '遇到对方违约怎么办？',
          a: '在订单详情页发起申诉，说明情况。管理员会介入仲裁，申诉成立的违约方扣 5 分信用。恶意申诉同样会扣分。'
        },
        {
          q: '可以匿名发布吗？',
          a: '可以。匿名发布后大厅不显示你的昵称和信誉分，但订单成立后对方仍能看到你的身份，便于交付沟通。'
        }
      ]
    }
  },
  onLoad() {
    this.announcements = listAnnouncements()
  },
  methods: {
    toggleFaq(i) {
      this.openFaq = this.openFaq === i ? -1 : i
    }
  }
}
</script>

<style scoped>
.body {
  padding: 24rpx 32rpx 60rpx;
}
.intro {
  background-color: #4c6fff;
  border-radius: 28rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}
.intro-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #ffffff;
}
.intro-text {
  display: block;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.6;
  margin-top: 12rpx;
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
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 18rpx;
}
.ann {
  border-top: 2rpx solid #f2f4fa;
  padding-top: 18rpx;
  margin-top: 18rpx;
}
.ann:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.ann-title {
  font-size: 25rpx;
  font-weight: 700;
  color: #14161f;
}
.ann-time {
  font-size: 19rpx;
  color: #b6bac9;
  margin-left: 10rpx;
}
.ann-body {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.6;
  margin-top: 8rpx;
}
.rule-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #eef1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
}
.rule-index-text {
  font-size: 21rpx;
  font-weight: 700;
  color: #4c6fff;
}
.rule-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
  flex: 1;
}
.items {
  margin-top: 16rpx;
}
.item {
  display: flex;
  flex-direction: row;
  margin-bottom: 10rpx;
}
.item-dot {
  font-size: 24rpx;
  color: #b6bac9;
  margin-right: 10rpx;
  line-height: 1.6;
}
.item-text {
  flex: 1;
  font-size: 23rpx;
  color: #4a4f63;
  line-height: 1.65;
}
.faq {
  border-top: 2rpx solid #f2f4fa;
  padding-top: 20rpx;
  margin-top: 20rpx;
}
.faq:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.faq-q {
  font-size: 25rpx;
  font-weight: 600;
  color: #14161f;
  line-height: 1.5;
}
.faq-arrow {
  font-size: 30rpx;
  color: #b6bac9;
  margin-left: 14rpx;
}
.faq-a {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.65;
  margin-top: 12rpx;
}
.footer {
  text-align: center;
  padding: 20rpx 0;
}
.footer-text {
  font-size: 20rpx;
  color: #c3c7d4;
}
</style>
