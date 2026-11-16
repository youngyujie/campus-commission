<template>
  <view class="cc-page" v-if="task">
    <AppHeader title="订单详情">
      <template #right>
        <text class="hdr-fav" @tap="toggleFav">{{ fav ? '★' : '☆' }}</text>
      </template>
    </AppHeader>

    <view class="body">
      <!-- 状态卡 -->
      <view class="card status-card">
        <view class="row between">
          <view class="row">
            <view class="pill" :style="{ backgroundColor: task.st.soft, color: task.st.color }">
              {{ task.st.name }}
            </view>
            <text v-if="task.urgent" class="pill urgent">加急</text>
            <view
              v-if="task.audit !== 'approved'"
              class="pill ml-8"
              :style="{ backgroundColor: task.au.soft, color: task.au.color }"
            >
              {{ task.au.name }}
            </view>
          </view>
          <text class="t-tiny">{{ task.createdLabel }}发布</text>
        </view>

        <view v-if="task.status !== 'cancelled'" class="steps">
          <view v-for="(s, i) in steps" :key="s.key" class="step">
            <view class="step-dot-wrap">
              <view class="step-dot" :class="{ 'step-dot-on': i + 1 <= task.st.step }"></view>
              <view
                v-if="i < steps.length - 1"
                class="step-bar"
                :class="{ 'step-bar-on': i + 1 < task.st.step }"
              ></view>
            </view>
            <text class="step-label" :class="{ 'step-label-on': i + 1 <= task.st.step }">
              {{ s.label }}
            </text>
          </view>
        </view>

        <view v-else class="cancel-tip">
          <text class="cancel-tip-text">该订单已取消</text>
        </view>

        <view v-if="task.audit === 'rejected' && task.auditReason" class="reject-tip">
          <text class="reject-tip-text">驳回原因：{{ task.auditReason }}</text>
        </view>
      </view>

      <!-- 主体 -->
      <view class="card main-card">
        <view class="row">
          <view class="cat-tag" :style="{ backgroundColor: task.cat.soft }">
            <text class="cat-tag-emoji">{{ task.cat.emoji }}</text>
            <text class="cat-tag-name" :style="{ color: task.cat.color }">{{ task.cat.name }}</text>
          </view>
          <view v-if="task.anonymous" class="pill anon-pill ml-8">匿名发布</view>
        </view>

        <text class="main-title">{{ task.title }}</text>
        <text class="main-desc">{{ task.desc }}</text>

        <!-- 代取类：商品价格 + 凭证 -->
        <view v-if="task.itemPrice" class="goods">
          <view class="goods-row">
            <text class="goods-key">商品价格</text>
            <text class="goods-val">{{ task.itemPriceLabel }}</text>
          </view>
          <view v-if="task.proof && task.proof.length" class="goods-proof">
            <text class="goods-key">凭证</text>
            <view class="proof-list">
              <view v-for="(p, i) in task.proof" :key="i" class="proof">
                <text class="proof-icon">🧾</text>
                <text class="proof-name ellipsis">{{ p.name }}</text>
              </view>
            </view>
          </view>
          <text class="goods-hint">商品价格由委托人垫付，接单人只负责跑腿</text>
        </view>

        <view class="reward">
          <view class="col flex1">
            <text class="reward-label">订单报酬</text>
            <text class="reward-num">{{ task.budgetLabel }}</text>
          </view>
          <view class="col reward-side">
            <view class="info-line">
              <text class="info-key">地点</text>
              <text class="info-val">{{ task.place }}</text>
            </view>
            <view class="info-line">
              <text class="info-key">截止</text>
              <text class="info-val">{{ task.deadlineLabel }}</text>
            </view>
          </view>
        </view>

        <view class="deposit-line">
          <text class="deposit-line-text">
            🔒 接单需缴纳 {{ task.requiredDeposit }} 元押金，验收通过后全额返还
          </text>
        </view>

        <view v-if="task.attachments && task.attachments.length" class="attach">
          <text class="attach-title">附件</text>
          <view v-for="(a, i) in task.attachments" :key="i" class="attach-item">
            <text class="attach-icon">📎</text>
            <text class="attach-name ellipsis">{{ a.name }}</text>
            <text class="attach-size">{{ a.size }}</text>
          </view>
        </view>
      </view>

      <!-- 委托人 -->
      <view class="card person-card">
        <text class="section-title">委托人</text>
        <view class="person" @tap="openUserSheet(task.anonymous ? '' : task.publisherId)">
          <Avatar :value="task.anonymous ? '🎭' : (task.publisher ? task.publisher.avatar : '🙂')" :size="88" />
          <view class="col flex1">
            <view class="row">
              <text class="p-name">{{ task.publisherName }}</text>
              <view
                v-if="!task.anonymous && task.publisher"
                class="p-level"
                :style="{ backgroundColor: pubLevel.soft }"
              >
                <text class="p-level-text" :style="{ color: pubLevel.color }">
                  {{ pubLevel.emoji }} {{ pubLevel.name }}
                </text>
              </view>
            </view>
            <text class="p-sub">{{ task.anonymous ? '该订单以匿名方式发布' : publisherCollege }}</text>
          </view>
          <view v-if="!task.anonymous && task.publisher" class="p-credit">
            <text class="p-credit-num">{{ task.publisher.credit }}</text>
            <text class="p-credit-label">信誉分</text>
          </view>
        </view>
      </view>

      <!-- 服务商 -->
      <view v-if="task.assignee" class="card person-card">
        <text class="section-title">接单人</text>
        <view class="person" @tap="openUserSheet(task.assigneeId)">
          <Avatar :value="task.assignee.avatar" :size="88" />
          <view class="col flex1">
            <text class="p-name">{{ task.assignee.nickname || task.assignee.name }}</text>
            <text class="p-sub">{{ task.assignee.college || '未填写院系' }}</text>
          </view>
          <view class="p-credit">
            <text class="p-credit-num">{{ task.assignee.credit }}</text>
            <text class="p-credit-label">信誉分</text>
          </view>
        </view>
        <view v-if="task.deposit" class="escrow">
          <text class="escrow-text">
            🔒 已冻结 {{ task.deposit }} 元押金{{ task.depositReturned ? '（已返还）' : '' }}
          </text>
        </view>
        <view class="row mt-24">
          <view class="btn btn-soft btn-small mr-16" @tap="openDm">
            <text class="btn-small-text soft-text">私聊</text>
          </view>
          <view
            v-if="!isMe(task.assignee.id)"
            class="btn btn-ghost btn-small"
            @tap="toggleFavProvider"
          >
            <text class="btn-small-text">{{ favProvider ? '已关注' : '关注 TA' }}</text>
          </view>
        </view>
      </view>

      <!-- 订单交流区 -->
      <view class="card">
        <view class="row between">
          <text class="section-title mb-0">订单交流区</text>
          <text class="t-tiny">{{ allMsgs.length }} 条留言</text>
        </view>
        <view class="discuss">
          <view v-for="m in shownMsgs" :key="m.id" class="dm">
            <Avatar :value="m.avatar" :size="48" />
            <view class="col flex1">
              <view class="row">
                <text class="dm-name">{{ m.name }}</text>
                <text class="dm-time">{{ m.timeLabel }}</text>
              </view>
              <text class="dm-text">{{ m.text }}</text>
            </view>
          </view>
          <text v-if="!allMsgs.length" class="dm-empty">还没有人留言，接单前可以先问问细节</text>
        </view>

        <view class="dm-input-row">
          <input
            v-model="draft"
            class="dm-input"
            placeholder="在交流区留个言…"
            placeholder-class="ph"
            confirm-type="send"
            @confirm="postMsg"
          />
          <view class="dm-send" :class="{ 'dm-send-on': draft.trim() }" @tap="postMsg">
            <text class="dm-send-text">发送</text>
          </view>
        </view>
      </view>

      <!-- 交付物 -->
      <view v-if="task.deliverable" class="card">
        <text class="section-title">交付成果</text>
        <view class="deliver">
          <text class="deliver-icon">📦</text>
          <view class="col flex1">
            <text class="deliver-name">{{ task.deliverable.name }}</text>
            <text v-if="task.deliverable.note" class="deliver-note">{{ task.deliverable.note }}</text>
            <text v-if="task.deliverable.size" class="deliver-size">{{ task.deliverable.size }}</text>
          </view>
        </view>
      </view>

      <!-- 评价 -->
      <view v-if="reviews.length" class="card">
        <text class="section-title">订单评价</text>
        <view v-for="r in reviews" :key="r.id" class="review">
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
      </view>

      <view class="bottom-space"></view>
    </view>

    <!-- 底部操作栏 -->
    <view class="actionbar">
      <view class="actionbar-inner">
        <view class="act-icon" @tap="report">
          <text class="act-icon-emoji">🚩</text>
          <text class="act-icon-label">举报</text>
        </view>
        <view
          class="btn btn-primary act-main"
          :class="{ 'btn-disabled': !action.enabled }"
          @tap="doAction"
        >
          <text class="act-main-text">{{ action.label }}</text>
        </view>
      </view>
    </view>

    <!-- 押金弹层 -->
    <view v-if="sheet === 'deposit'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">缴纳押金</text>
        <view class="dep-box">
          <view class="dep-line">
            <text class="dep-key">本单需要</text>
            <text class="dep-val">¥{{ dep.required }}</text>
          </view>
          <view class="dep-line">
            <text class="dep-key">当前押金余额</text>
            <text class="dep-val">¥{{ dep.have }}</text>
          </view>
          <view class="dep-line">
            <text class="dep-key">还需补交</text>
            <text class="dep-val dep-red">¥{{ dep.shortage }}</text>
          </view>
        </view>
        <text class="dep-hint">押金在验收通过后全额返还；被客诉且申诉成立会按情节扣除</text>
        <text class="label mt-24">缴纳金额</text>
        <input v-model="depAmount" class="input" type="digit" :placeholder="String(dep.shortage)" placeholder-class="ph" />
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-small-text">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="payDeposit">
            <text class="act-main-text">缴纳并接单</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 交付弹层 -->
    <view v-if="sheet === 'deliver'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">提交交付成果</text>
        <view class="pick-file" @tap="pickDeliverFile">
          <text class="pick-file-text">📎 选择文件 / 图片（自动填入名称）</text>
        </view>
        <text class="label">交付物名称</text>
        <input v-model="deliverForm.name" class="input" placeholder="例：毕业照-精修 32 张.zip" placeholder-class="ph" />
        <text class="label mt-24">补充说明</text>
        <textarea v-model="deliverForm.note" class="textarea" placeholder="交付了什么、放在哪里、需要对方注意什么" placeholder-class="ph" />
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-small-text">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="submitDeliver">
            <text class="act-main-text">提交</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 申诉弹层 -->
    <view v-if="sheet === 'dispute'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">发起申诉</text>
        <text class="sheet-hint">说明对方违约或交付不符的情况，管理员会介入仲裁，并从押金中按情节扣罚。</text>
        <textarea v-model="disputeReason" class="textarea" placeholder="例：约定今晚 8 点交付，实际拖到第二天，影响了我的使用" placeholder-class="ph" />
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-small-text">取消</text>
          </view>
          <view class="btn btn-accent flex1" @tap="submitDispute">
            <text class="act-main-text">提交申诉</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import Avatar from '../../components/Avatar.vue'
import { STEPS, creditLevel, tint } from '../../utils/constants.js'
import { pickFiles, formatSize } from '../../utils/file.js'
import {
  getTask,
  currentUser,
  takeTask,
  depositCheck,
  rechargeDeposit,
  startWork,
  submitDeliverable,
  acceptDeliverable,
  cancelTask,
  reviewsOfTask,
  hasReviewed,
  isFavoriteTask,
  isFavoriteProvider,
  toggleFavoriteTask,
  toggleFavoriteProvider,
  addReport,
  createDispute,
  requestFriend,
  needStudentId,
  orderMessages,
  sendOrderMessage,
  latestTaskWith,
  recordTaskView
} from '../../utils/store.js'

export default {
  components: { AppHeader, Avatar },
  data() {
    return {
      id: '',
      steps: STEPS,
      sheet: '',
      fav: false,
      favProvider: false,
      deliverForm: { name: '', note: '', size: '' },
      disputeReason: '',
      draft: '',
      dep: { required: 0, have: 0, shortage: 0 },
      depAmount: '',
      tick: 0
    }
  },
  computed: {
    task() {
      return this.tick >= 0 ? getTask(this.id) : null
    },
    me() {
      return currentUser()
    },
    reviews() {
      return reviewsOfTask(this.id)
    },
    isPublisher() {
      return !!(this.task && this.me && this.task.publisherId === this.me.id)
    },
    isAssignee() {
      return !!(this.task && this.me && this.task.assigneeId === this.me.id)
    },
    publisherCollege() {
      const p = this.task && this.task.publisher
      return p && p.college ? p.college : '未填写院系'
    },
    pubLevel() {
      const lv = creditLevel(this.task && this.task.publisher ? this.task.publisher.credit : 60)
      return { ...lv, soft: tint(lv.color, 0.12) }
    },
    allMsgs() {
      return this.tick >= 0 ? orderMessages(this.id) : []
    },
    shownMsgs() {
      return this.allMsgs.slice(-3)
    },
    action() {
      const t = this.task
      if (!t || !this.me) return { type: 'none', label: '请先登录', enabled: false }
      const reviewed = hasReviewed(t.id, this.me.id)

      if (t.audit === 'pending') return { type: 'none', label: '等待平台审核', enabled: false }
      if (t.audit === 'rejected') return { type: 'none', label: '审核未通过', enabled: false }

      if (t.status === 'pending') {
        if (this.isPublisher) return { type: 'cancel', label: '取消订单（扣 2 分）', enabled: true }
        if (needStudentId(this.me)) return { type: 'needSid', label: '请先完成学生认证', enabled: true }
        if (t.expired) return { type: 'none', label: '已过截止时间', enabled: false }
        return { type: 'take', label: `接取订单（押金 ¥${t.requiredDeposit}）`, enabled: true }
      }
      if (t.status === 'assigned') {
        if (this.isAssignee) return { type: 'start', label: '开始处理', enabled: true }
        if (this.isPublisher) return { type: 'none', label: '已有人接单，等待开工', enabled: false }
        return { type: 'none', label: '已被其他同学接单', enabled: false }
      }
      if (t.status === 'working') {
        if (this.isAssignee) return { type: 'deliver', label: '提交交付成果', enabled: true }
        if (this.isPublisher) return { type: 'none', label: '接单人正在处理中', enabled: false }
        return { type: 'none', label: '该订单正在进行中', enabled: false }
      }
      if (t.status === 'submitted') {
        if (this.isPublisher) return { type: 'accept', label: '验收并确认完成', enabled: true }
        if (this.isAssignee) return { type: 'none', label: '已交付，等待对方验收', enabled: false }
        return { type: 'none', label: '待委托人验收', enabled: false }
      }
      if (t.status === 'done') {
        if (reviewed) return { type: 'none', label: '你已评价过这单', enabled: false }
        if (this.isPublisher || this.isAssignee) return { type: 'review', label: '评价对方', enabled: true }
        return { type: 'none', label: '该订单已完成', enabled: false }
      }
      return { type: 'none', label: '该订单已取消', enabled: false }
    }
  },
  onLoad(options) {
    this.id = options.id || ''
    if (this.id) recordTaskView(this.id)
    this.refresh()
    // 从卡片「立即接单」进来：直接走接单流程（押金不足会弹补交层）
    if (options && options.take === '1') {
      setTimeout(() => {
        const a = this.action
        if (a && (a.type === 'take' || a.type === 'needSid')) this.doAction()
      }, 280)
    }
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
      this.fav = isFavoriteTask(this.id)
      const t = getTask(this.id)
      if (t && t.assigneeId) this.favProvider = isFavoriteProvider(t.assigneeId)
      this.tick++
    },
    isMe(id) {
      return !!(this.me && this.me.id === id)
    },
    starText(n) {
      return '★'.repeat(n) + '☆'.repeat(5 - n)
    },
    closeSheet() {
      this.sheet = ''
    },
    goProfile(id) {
      if (!id) return
      uni.navigateTo({ url: '/pages/profile/profile?id=' + id })
    },
    openUserSheet(id) {
      if (!id) return
      if (this.me && this.me.id === id) {
        this.goProfile(id)
        return
      }
      uni.showActionSheet({
        itemList: ['查看主页', '私聊', '加好友'],
        success: (res) => {
          if (res.tapIndex === 0) this.goProfile(id)
          else if (res.tapIndex === 1) {
            uni.navigateTo({ url: `/pages/room/room?otherId=${id}` })
          } else {
            const r = requestFriend(id)
            uni.showToast({ title: r.msg, icon: 'none' })
          }
        }
      })
    },
    toggleFav() {
      const r = toggleFavoriteTask(this.id)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.fav = r.on
      uni.showToast({ title: r.msg, icon: 'none' })
    },
    toggleFavProvider() {
      const r = toggleFavoriteProvider(this.task.assigneeId)
      uni.showToast({ title: r.msg, icon: 'none' })
      this.favProvider = r.on
    },
    openDm() {
      if (!this.me) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const otherId = this.isPublisher ? this.task.assigneeId : this.task.publisherId
      uni.navigateTo({ url: `/pages/room/room?otherId=${otherId}` })
    },
    postMsg() {
      const text = this.draft.trim()
      if (!text) return
      const r = sendOrderMessage(this.id, { text })
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.draft = ''
      this.refresh()
    },
    doAction() {
      const a = this.action
      if (!a.enabled) {
        uni.showToast({ title: a.label, icon: 'none' })
        return
      }
      if (a.type === 'needSid') {
        uni.showModal({
          title: '请先完成学生认证',
          content: '未完成学生认证只能浏览，认证通过后才能接单。',
          confirmText: '去认证',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/verify/verify' })
          }
        })
        return
      }
      if (a.type === 'take') {
        const chk = depositCheck(this.id)
        if (!chk.ok) {
          this.dep = chk
          this.depAmount = String(chk.shortage)
          this.sheet = 'deposit'
          return
        }
        const r = takeTask(this.id)
        if (!r.ok) {
          uni.showToast({ title: r.msg, icon: 'none' })
          if (r.needDeposit) {
            this.dep = { required: r.required, have: r.have, shortage: r.shortage }
            this.depAmount = String(r.shortage)
            this.sheet = 'deposit'
          }
          return
        }
        uni.showToast({ title: r.msg, icon: 'none' })
        this.refresh()
      } else if (a.type === 'cancel') {
        uni.showModal({
          title: '取消订单',
          content: '取消会扣 2 点信誉分，确定要取消吗？',
          confirmText: '确定取消',
          confirmColor: '#F04A4A',
          success: (res) => {
            if (!res.confirm) return
            const r = cancelTask(this.id)
            uni.showToast({ title: r.msg, icon: 'none' })
            this.refresh()
          }
        })
      } else if (a.type === 'start') {
        const r = startWork(this.id)
        uni.showToast({ title: r.msg, icon: 'none' })
        this.refresh()
      } else if (a.type === 'deliver') {
        this.sheet = 'deliver'
      } else if (a.type === 'accept') {
        uni.showModal({
          title: '确认验收',
          content: '确认后订单完成，双方信誉分各 +2，接单人押金全额返还。报酬请线下自行结算。',
          confirmText: '确认完成',
          confirmColor: '#FF8A3D',
          success: (res) => {
            if (!res.confirm) return
            const r = acceptDeliverable(this.id)
            uni.showToast({ title: r.msg, icon: 'none' })
            this.refresh()
          }
        })
      } else if (a.type === 'review') {
        uni.navigateTo({ url: '/pages/review/review?taskId=' + this.id })
      }
    },
    payDeposit() {
      const amt = Number(this.depAmount) || 0
      if (amt <= 0) {
        uni.showToast({ title: '请输入缴纳金额', icon: 'none' })
        return
      }
      const r = rechargeDeposit(amt)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      const t = takeTask(this.id)
      if (!t.ok) {
        uni.showToast({ title: t.msg, icon: 'none' })
        this.refresh()
        return
      }
      this.sheet = ''
      uni.showToast({ title: t.msg, icon: 'none' })
      this.refresh()
    },
    submitDeliver() {
      const r = submitDeliverable(this.id, this.deliverForm)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.sheet = ''
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    },
    async pickDeliverFile() {
      const files = await pickFiles({ count: 1 })
      if (!files.length) return
      const f = files[0]
      this.deliverForm.name = f.name
      this.deliverForm.size = formatSize(f.size)
    },
    submitDispute() {
      const r = createDispute({ taskId: this.id, reason: this.disputeReason })
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.sheet = ''
      this.disputeReason = ''
      uni.showToast({ title: r.msg, icon: 'none' })
    },
    report() {
      uni.showActionSheet({
        itemList: ['违规订单（代写代考等）', '骚扰或辱骂', '虚假信息', '其他'],
        success: (res) => {
          const reasons = ['违规订单', '骚扰辱骂', '虚假信息', '其他']
          const r = addReport({ targetType: 'task', targetId: this.id, reason: reasons[res.tapIndex] })
          uni.showToast({ title: r.msg, icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.hdr-fav {
  font-size: 36rpx;
  color: #ff8a3d;
}
.body {
  padding: 20rpx 32rpx 0;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
.ml-8 {
  margin-left: 8rpx;
}
.mb-0 {
  margin-bottom: 0;
}
.urgent {
  background-color: #fff2e8;
  color: #ff8a3d;
  margin-left: 8rpx;
}
.anon-pill {
  background-color: #f1f2f6;
  color: #8b90a3;
}
.steps {
  display: flex;
  flex-direction: row;
  margin-top: 28rpx;
}
.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.step-dot-wrap {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 20rpx;
}
.step-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #e3e6f0;
}
.step-dot-on {
  background-color: #4c6fff;
}
.step-bar {
  position: absolute;
  left: 50%;
  right: -50%;
  height: 4rpx;
  background-color: #e3e6f0;
  top: 8rpx;
}
.step-bar-on {
  background-color: #4c6fff;
}
.step-label {
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 12rpx;
}
.step-label-on {
  color: #4c6fff;
  font-weight: 600;
}
.cancel-tip {
  margin-top: 24rpx;
  background-color: #f1f2f6;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
}
.cancel-tip-text {
  font-size: 23rpx;
  color: #8b90a3;
}
.reject-tip {
  margin-top: 16rpx;
  background-color: #fcebeb;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
}
.reject-tip-text {
  font-size: 23rpx;
  color: #a32d2d;
  line-height: 1.5;
}
.cat-tag {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 46rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
}
.cat-tag-emoji {
  font-size: 22rpx;
  margin-right: 6rpx;
}
.cat-tag-name {
  font-size: 22rpx;
  font-weight: 700;
}
.main-title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  color: #14161f;
  line-height: 1.4;
  margin-top: 20rpx;
  letter-spacing: -0.6rpx;
}
.main-desc {
  display: block;
  font-size: 27rpx;
  color: #4a4f63;
  line-height: 1.68;
  margin-top: 16rpx;
}
.goods {
  margin-top: 22rpx;
  background-color: #fff8ee;
  border-radius: 16rpx;
  padding: 20rpx;
}
.goods-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.goods-key {
  font-size: 22rpx;
  color: #a8621f;
}
.goods-val {
  font-size: 30rpx;
  font-weight: 800;
  color: #ff8a3d;
}
.goods-proof {
  margin-top: 14rpx;
}
.proof-list {
  margin-top: 10rpx;
}
.proof {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 8rpx;
}
.proof-icon {
  font-size: 22rpx;
  margin-right: 8rpx;
}
.proof-name {
  flex: 1;
  font-size: 22rpx;
  color: #4a4f63;
}
.goods-hint {
  display: block;
  font-size: 19rpx;
  color: #c08a52;
  margin-top: 12rpx;
}
.reward {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  margin-top: 26rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f2f4fa;
}
.reward-label {
  font-size: 21rpx;
  color: #8b90a3;
}
.reward-num {
  font-size: 48rpx;
  font-weight: 800;
  color: #ff8a3d;
  line-height: 1.1;
  margin-top: 6rpx;
  letter-spacing: -1rpx;
}
.reward-side {
  align-items: flex-end;
}
.info-line {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}
.info-key {
  font-size: 21rpx;
  color: #b6bac9;
  margin-right: 12rpx;
}
.info-val {
  font-size: 23rpx;
  color: #4a4f63;
  font-weight: 600;
}
.deposit-line {
  margin-top: 20rpx;
  background-color: #eef1ff;
  border-radius: 14rpx;
  padding: 14rpx 18rpx;
}
.deposit-line-text {
  font-size: 21rpx;
  color: #4c6fff;
  line-height: 1.5;
}
.attach {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f2f4fa;
}
.attach-title {
  display: block;
  font-size: 21rpx;
  color: #8b90a3;
  margin-bottom: 12rpx;
}
.attach-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #f7f8fc;
  border-radius: 14rpx;
  padding: 14rpx 18rpx;
  margin-bottom: 10rpx;
}
.attach-icon {
  font-size: 24rpx;
  margin-right: 10rpx;
}
.attach-name {
  flex: 1;
  font-size: 24rpx;
  color: #4a4f63;
}
.attach-size {
  font-size: 20rpx;
  color: #b6bac9;
  margin-left: 12rpx;
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 20rpx;
}
.person {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: #f2f4fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  margin-right: 20rpx;
}
.p-name {
  font-size: 29rpx;
  font-weight: 700;
  color: #14161f;
  margin-right: 10rpx;
}
.p-level {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.p-level-text {
  font-size: 19rpx;
  font-weight: 700;
}
.p-sub {
  font-size: 22rpx;
  color: #8b90a3;
  margin-top: 6rpx;
}
.p-credit {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.p-credit-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #4c6fff;
  line-height: 1.1;
}
.p-credit-label {
  font-size: 18rpx;
  color: #b6bac9;
  margin-top: 4rpx;
}
.escrow {
  margin-top: 18rpx;
  background-color: #e6faf6;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}
.escrow-text {
  font-size: 21rpx;
  color: #17977f;
}
.btn-small {
  height: 68rpx;
  padding: 0 28rpx;
}
.btn-small-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #4a4f63;
}
.soft-text {
  color: #4c6fff;
}
.discuss {
  margin-top: 6rpx;
}
.dm {
  display: flex;
  flex-direction: row;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f7f8fc;
}
.dm-avatar {
  font-size: 30rpx;
  margin-right: 14rpx;
}
.dm-name {
  font-size: 22rpx;
  font-weight: 700;
  color: #4a4f63;
  margin-right: 10rpx;
}
.dm-time {
  font-size: 18rpx;
  color: #c3c7d4;
}
.dm-text {
  display: block;
  font-size: 24rpx;
  color: #14161f;
  line-height: 1.55;
  margin-top: 6rpx;
}
.dm-empty {
  display: block;
  font-size: 22rpx;
  color: #b6bac9;
  padding: 24rpx 0;
  text-align: center;
}
.dm-input-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 18rpx;
}
.dm-input {
  flex: 1;
  height: 76rpx;
  background-color: #f5f7fb;
  border-radius: 999rpx;
  padding: 0 24rpx;
  font-size: 25rpx;
  color: #14161f;
  box-sizing: border-box;
}
.dm-send {
  margin-left: 12rpx;
  height: 72rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background-color: #e9ebf2;
  display: flex;
  align-items: center;
}
.dm-send-on {
  background-color: #4c6fff;
}
.dm-send-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}
.deliver {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
}
.deliver-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.deliver-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
}
.deliver-note {
  font-size: 22rpx;
  color: #8b90a3;
  margin-top: 6rpx;
}
.deliver-size {
  font-size: 19rpx;
  color: #b6bac9;
  margin-top: 4rpx;
}
.review {
  border-top: 2rpx solid #f2f4fa;
  padding-top: 20rpx;
  margin-top: 20rpx;
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
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  z-index: 80;
}
.actionbar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.act-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 92rpx;
  flex-shrink: 0;
}
.act-icon-emoji {
  font-size: 32rpx;
  line-height: 36rpx;
}
.act-icon-label {
  font-size: 18rpx;
  color: #8b90a3;
  margin-top: 4rpx;
}
.act-main {
  flex: 1;
  margin-left: 16rpx;
  height: 88rpx;
}
.act-main-text {
  font-size: 29rpx;
  font-weight: 700;
  color: #ffffff;
}
.btn-disabled .act-main-text {
  color: #9aa0b4;
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
.sheet-hint {
  display: block;
  font-size: 22rpx;
  color: #8b90a3;
  margin-bottom: 18rpx;
}
.dep-box {
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
}
.dep-line {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 8rpx 0;
}
.dep-key {
  font-size: 24rpx;
  color: #8b90a3;
}
.dep-val {
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
}
.dep-red {
  color: #f04a4a;
}
.dep-hint {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 14rpx;
  line-height: 1.5;
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
.pick-file {
  height: 80rpx;
  border: 2rpx dashed #d8dcea;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.pick-file-text {
  font-size: 23rpx;
  color: #8b90a3;
}
</style>
