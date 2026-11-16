<template>
  <view class="cc-page">
    <AppHeader title="管理后台" />

    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <text
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ 'tab-on': tab === t.key }"
          @tap="tab = t.key"
        >
          {{ t.label }}<text v-if="t.badge" class="tab-badge">{{ t.badge }}</text>
        </text>
      </view>
    </scroll-view>

    <view class="body">
      <!-- 概览 -->
      <view v-if="tab === 'home'">
        <view class="grid">
          <view class="stat-card">
            <text class="stat-num">{{ stats.userCount }}</text>
            <text class="stat-label">注册学生</text>
          </view>
          <view class="stat-card">
            <text class="stat-num">{{ stats.taskCount }}</text>
            <text class="stat-label">委托总数</text>
          </view>
          <view class="stat-card">
            <text class="stat-num accent">{{ stats.todayTasks }}</text>
            <text class="stat-label">今日发布</text>
          </view>
          <view class="stat-card">
            <text class="stat-num mint">{{ stats.todayDone }}</text>
            <text class="stat-label">今日完成</text>
          </view>
          <view class="stat-card">
            <text class="stat-num warn">{{ stats.pendingAudit }}</text>
            <text class="stat-label">待审核</text>
          </view>
          <view class="stat-card">
            <text class="stat-num danger">{{ stats.openDisputes }}</text>
            <text class="stat-label">待处理申诉</text>
          </view>
        </view>

        <view class="card">
          <view class="row between">
            <text class="section-title mb-0">成交金额（已完成）</text>
            <text class="amount">¥{{ stats.totalAmount }}</text>
          </view>
          <text class="hint">平台不碰资金，报酬由双方线下结算，此数据仅用于统计</text>
        </view>

        <view class="card">
          <text class="section-title">热门分类</text>
          <view v-for="h in stats.hot" :key="h.cat.key" class="hot">
            <text class="hot-name">{{ h.cat.emoji }} {{ h.cat.name }}</text>
            <view class="hot-bar-wrap">
              <view class="hot-bar" :style="{ width: barWidth(h.count), backgroundColor: h.cat.color }"></view>
            </view>
            <text class="hot-count">{{ h.count }}</text>
          </view>
        </view>
      </view>

      <!-- 审核 -->
      <view v-if="tab === 'audit'">
        <view v-for="t in auditList" :key="t.id" class="card">
          <view class="row between">
            <text class="card-title ellipsis flex1">{{ t.title }}</text>
            <text class="t-tiny">{{ t.createdLabel }}</text>
          </view>
          <text class="card-desc">{{ t.desc }}</text>
          <view class="meta">
            <text class="meta-item">{{ t.cat.emoji }} {{ t.cat.name }}</text>
            <text class="meta-item">💰 ¥{{ t.budget }}</text>
            <text class="meta-item">📍 {{ t.place }}</text>
          </view>
          <view class="meta">
            <text class="meta-item">发布人：{{ t.publisherName }}</text>
            <text v-if="t.anonymous" class="meta-item warn-text">匿名发布</text>
          </view>
          <view class="row mt-24">
            <view class="btn btn-ghost flex1 mr-16 btn-sm" @tap="reject(t)">
              <text class="btn-text-dark">驳回</text>
            </view>
            <view class="btn btn-primary flex1 btn-sm" @tap="pass(t)">
              <text class="btn-text-white">通过并上架</text>
            </view>
          </view>
        </view>
        <EmptyState
          v-if="!auditList.length"
          emoji="✅"
          title="没有待审核的委托"
          desc="合规内容发布后直接上架，含违规词的会在发布时就被拦下"
        />

        <view class="section-head">
          <text class="section-title-sm">已上架 · 抽查下架</text>
          <text class="section-sub">最近 {{ approvedList.length }} 条</text>
        </view>
        <view v-for="t in approvedList" :key="'a' + t.id" class="card">
          <view class="row between">
            <text class="card-title ellipsis flex1">{{ t.title }}</text>
            <text class="t-tiny">{{ t.createdLabel }}</text>
          </view>
          <view class="meta">
            <text class="meta-item">{{ t.cat.emoji }} {{ t.cat.name }}</text>
            <text class="meta-item">💰 ¥{{ t.budget }}</text>
            <text class="meta-item">发布人：{{ t.publisherName }}</text>
          </view>
          <view class="row mt-24">
            <view class="btn btn-ghost flex1 btn-sm" @tap="reject(t)">
              <text class="btn-text-dark">下架</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户管理：所有注册人员 -->
      <view v-if="tab === 'user'">
        <view class="search">
          <text class="search-icon">🔍</text>
          <input
            v-model="userKeyword"
            class="search-input"
            placeholder="搜用户名、姓名、手机号、学号"
            placeholder-class="ph"
          />
        </view>
        <view class="u-filters">
          <view
            v-for="f in userFilters"
            :key="f.key"
            class="u-filter"
            :class="{ 'u-filter-on': userFilter === f.key }"
            @tap="setUserFilter(f.key)"
          >
            <text class="u-filter-text">{{ f.label }} {{ f.count }}</text>
          </view>
        </view>
        <EmptyState v-if="!userList.length" emoji="👥" title="没有匹配的账号" desc="换个关键词或筛选条件试试" />
        <view v-for="u in userList" :key="u.id" class="card user-card">
          <view class="row">
            <Avatar :value="u.avatar" :size="64" />
            <view class="col flex1">
              <view class="row u-name-row">
                <text class="u-name">{{ u.nickname || u.name || u.username || '同学' }}</text>
                <view v-if="u.role === 'admin'" class="pill u-role-admin">管理员</view>
                <view v-if="u.status === 'banned'" class="pill banned">已封禁</view>
                <view v-if="u.isMe" class="pill u-role-self">我</view>
              </view>
              <text class="u-sub">用户名 {{ u.username || '—' }} · ID {{ u.id }}</text>
              <text class="u-sub">手机号 {{ u.phone || '未填写' }} · 学号 {{ u.studentId || '未填写' }}</text>
              <text class="u-sub">{{ u.college || '未填写院系' }} · {{ joinedLabel(u) }}注册</text>
            </view>
            <view class="col u-right">
              <text class="u-credit">{{ u.credit }}</text>
              <text class="u-credit-label">信誉分</text>
            </view>
          </view>
          <view class="u-info">
            <text class="u-info-item">押金 ¥{{ u.deposit || 0 }}</text>
            <text class="u-info-item">发布 {{ uStat(u, 'publishedCount') }}</text>
            <text class="u-info-item">接单 {{ uStat(u, 'takenCount') }}</text>
            <text class="u-info-item">完成 {{ uStat(u, 'doneCount') }}</text>
          </view>
          <view class="u-actions">
            <view class="btn btn-sm btn-ghost" @tap="showUser(u)">
              <text class="btn-text-dark">查看资料</text>
            </view>
            <view
              class="btn btn-sm"
              :class="u.status === 'banned' ? 'btn-soft' : 'btn-ghost'"
              @tap="ban(u)"
            >
              <text :class="u.status === 'banned' ? 'btn-text-blue' : 'btn-text-dark'">
                {{ u.status === 'banned' ? '解封' : '封禁' }}
              </text>
            </view>
            <view class="btn btn-sm u-manage-btn" @tap="moreActions(u)">
              <text class="u-manage-text">管理 ▾</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 申诉 -->
      <view v-if="tab === 'dispute'">
        <view v-for="d in disputeList" :key="d.id" class="card">
          <view class="row between">
            <text class="card-title ellipsis flex1">{{ d.task ? d.task.title : '订单已删除' }}</text>
            <view class="pill" :style="{ backgroundColor: d.statusInfo.soft, color: d.statusInfo.color }">
              {{ d.statusInfo.name }}
            </view>
          </view>
          <text class="card-desc">申诉人：{{ d.from ? d.from.name : '未知' }} · {{ d.timeLabel }}</text>
          <view class="reason">
            <text class="reason-text">{{ d.reason }}</text>
          </view>
          <view v-if="d.reply" class="reply">
            <text class="reply-text">处理结果：{{ d.reply }}</text>
          </view>
          <view v-else class="row mt-24">
            <view class="btn btn-ghost flex1 mr-16 btn-sm" @tap="resolve(d, 'reject')">
              <text class="btn-text-dark">驳回申诉</text>
            </view>
            <view class="btn btn-accent flex1 btn-sm" @tap="resolve(d, 'penalize')">
              <text class="btn-text-white">判违约扣 5 分</text>
            </view>
          </view>
        </view>
        <EmptyState v-if="!disputeList.length" emoji="⚖️" title="没有申诉记录" desc="订单双方发起申诉后会出现在这里" />
      </view>

      <!-- 订单管理 -->
      <view v-if="tab === 'order'">
        <scroll-view class="filters" scroll-x :show-scrollbar="false">
          <view class="filters-inner">
            <view
              v-for="f in orderFilters"
              :key="f.key"
              class="filter"
              :class="{ 'filter-on': orderFilter === f.key }"
              @tap="orderFilter = f.key"
            >
              <text class="filter-text" :class="{ 'filter-text-on': orderFilter === f.key }">
                {{ f.label }}<text v-if="f.count" class="filter-count">{{ f.count }}</text>
              </text>
            </view>
          </view>
        </scroll-view>

        <view v-for="t in orderList" :key="t.id" class="card order-card" @tap="openTask(t.id)">
          <view class="row between">
            <text class="card-title ellipsis flex1">{{ t.title }}</text>
            <view class="pill" :style="{ backgroundColor: t.st.soft, color: t.st.color }">
              {{ t.st.name }}
            </view>
          </view>
          <view class="meta">
            <text class="meta-item">{{ t.cat.emoji }} {{ t.cat.name }}</text>
            <text class="meta-item">💰 ¥{{ t.budget }}</text>
            <text class="meta-item">👤 {{ t.publisherName }}</text>
            <text v-if="t.assignee" class="meta-item">🤝 {{ t.assignee.nickname || t.assignee.name }}</text>
            <text v-if="t.audit !== 'approved'" class="meta-item warn-text">{{ t.au.name }}</text>
          </view>
          <view class="row between mt-16">
            <text class="t-tiny">{{ t.createdLabel }}发布 · {{ t.deadlineLabel }}截止</text>
            <text class="order-detail">查看详情 ›</text>
          </view>
        </view>

        <EmptyState v-if="!orderList.length" emoji="📋" title="没有符合条件的订单" desc="换个筛选条件试试" />
      </view>

      <!-- 分类 -->
      <view v-if="tab === 'category'">
        <view class="card">
          <text class="section-title">添加分类</text>
          <view class="row">
            <input v-model="newCat.emoji" class="input cat-emoji-input" maxlength="2" placeholder="😀" placeholder-class="ph" />
            <input v-model="newCat.name" class="input flex1" placeholder="分类名称" placeholder-class="ph" />
            <view class="btn btn-primary btn-sm ml-16" @tap="addCat">
              <text class="btn-text-white">添加</text>
            </view>
          </view>
        </view>
        <view v-for="c in categories" :key="c.key" class="card cat-row">
          <view class="row flex1">
            <text class="cat-emoji">{{ c.emoji }}</text>
            <text class="cat-name">{{ c.name }}</text>
          </view>
          <text class="cat-del" @tap="delCat(c)">删除</text>
        </view>
      </view>

      <!-- 公告 -->
      <view v-if="tab === 'notice'">
        <view class="card">
          <text class="section-title">发布公告</text>
          <input v-model="ann.title" class="input" placeholder="公告标题" placeholder-class="ph" />
          <textarea v-model="ann.body" class="textarea mt-16" placeholder="公告内容，会推送给所有学生" placeholder-class="ph" />
          <view class="btn btn-primary btn-block mt-24" @tap="publish">
            <text class="btn-text-white">发布并推送</text>
          </view>
        </view>
        <view v-for="a in announcements" :key="a.id" class="card">
          <view class="row between">
            <text class="card-title ellipsis flex1">{{ a.title }}</text>
            <text class="t-tiny">{{ a.timeLabel }}</text>
          </view>
          <text class="card-desc">{{ a.body }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import Avatar from '../../components/Avatar.vue'
import EmptyState from '../../components/EmptyState.vue'
import {
  isAdmin,
  currentUser,
  adminStats,
  listAuditTasks,
  listApprovedTasks,
  auditTask,
  adminUsers,
  adminManageUser,
  logout,
  listAllDisputes,
  listAllTasks,
  resolveDispute,
  listCategories,
  addCategory,
  removeCategory,
  listAnnouncements,
  publishAnnouncement
} from '../../utils/store.js'

export default {
  components: { AppHeader, EmptyState, Avatar },
  data() {
    return {
      tab: 'home',
      stats: {},
      auditList: [],
      approvedList: [],
      userList: [],
      userAll: [],
      userKeyword: '',
      userFilter: 'all',
      userFilters: [],
      disputeList: [],
      orderList: [],
      orderFilter: 'all',
      orderFilters: [],
      categories: [],
      announcements: [],
      newCat: { emoji: '', name: '' },
      ann: { title: '', body: '' },
      tabs: []
    }
  },
  onLoad() {
    if (!isAdmin()) {
      uni.showToast({ title: '仅管理员可访问', icon: 'none' })
      setTimeout(() => uni.navigateBack({ delta: 1 }), 800)
      return
    }
    this.refresh()
  },
  onShow() {
    if (isAdmin()) this.refresh()
  },
  watch: {
    userKeyword() {
      this.applyUserFilter()
    },
    orderFilter() {
      this.buildOrders()
    }
  },
  methods: {
    refresh() {
      this.stats = adminStats()
      this.auditList = listAuditTasks()
      this.approvedList = listApprovedTasks(20)
      this.loadUsers()
      this.disputeList = listAllDisputes()
      this.categories = listCategories()
      this.announcements = listAnnouncements()
      this.buildOrders()
      this.tabs = [
        { key: 'home', label: '数据概览', badge: 0 },
        { key: 'audit', label: '审核与下架', badge: this.stats.pendingAudit },
        { key: 'order', label: '订单管理', badge: 0 },
        { key: 'user', label: '用户管理', badge: 0 },
        { key: 'dispute', label: '申诉处理', badge: this.stats.openDisputes },
        { key: 'category', label: '分类管理', badge: 0 },
        { key: 'notice', label: '公告发布', badge: 0 }
      ]
    },
    // 管理员专用：共享模式读服务端全量用户，本地模式读本地全量
    async loadUsers() {
      const r = await adminUsers('')
      if (!r.ok) {
        if (r.code === 'need_login') {
          logout()
          uni.showToast({ title: r.msg, icon: 'none' })
          setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 900)
          return
        }
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      const me = currentUser()
      this.userAll = (r.list || []).map((u) => ({ ...u, isMe: !!(me && u.id === me.id) }))
      this.userFilters = [
        { key: 'all', label: '全部', count: this.userAll.length },
        { key: 'user', label: '学生', count: this.userAll.filter((u) => u.role !== 'admin').length },
        { key: 'admin', label: '管理员', count: this.userAll.filter((u) => u.role === 'admin').length },
        { key: 'banned', label: '已封禁', count: this.userAll.filter((u) => u.status === 'banned').length }
      ]
      const ti = this.tabs.findIndex((t) => t.key === 'user')
      if (ti >= 0) this.tabs[ti].badge = this.userAll.length
      this.applyUserFilter()
    },
    applyUserFilter() {
      const k = String(this.userKeyword || '').trim().toLowerCase()
      this.userList = this.userAll.filter((u) => {
        if (
          k &&
          ![
            u.name,
            u.nickname,
            u.username,
            u.studentId,
            u.phone,
            u.email,
            u.college,
            u.id
          ].some((v) => String(v || '').toLowerCase().includes(k))
        ) {
          return false
        }
        if (this.userFilter === 'user' && u.role === 'admin') return false
        if (this.userFilter === 'admin' && u.role !== 'admin') return false
        if (this.userFilter === 'banned' && u.status !== 'banned') return false
        return true
      })
    },
    setUserFilter(k) {
      this.userFilter = k
      this.applyUserFilter()
    },
    uStat(u, key) {
      if (u[key] !== undefined && u[key] !== null) return u[key]
      return (u.stats && u.stats[key]) || 0
    },
    joinedLabel(u) {
      const t = Number(u.joinedAt) || 0
      if (!t) return '时间未知 '
      const d = new Date(t)
      const pad = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' '
    },
    showUser(u) {
      const lines = [
        '用户名：' + (u.username || '—'),
        '昵称：' + (u.nickname || u.name || '—'),
        '手机号：' + (u.phone || '未填写'),
        '学号：' + (u.studentId || '未填写'),
        '邮箱：' + (u.email || '未填写'),
        '院系：' + (u.college || '未填写'),
        '学生认证：' + (u.verifiedAt ? '已认证' : '未认证'),
        '角色：' + (u.role === 'admin' ? '管理员' : '学生'),
        '状态：' + (u.status === 'banned' ? '已封禁' : '正常'),
        '信誉分：' + (u.credit === undefined ? 0 : u.credit),
        '押金：¥' + (u.deposit || 0),
        '发布 / 接单 / 完成：' + this.uStat(u, 'publishedCount') + ' / ' + this.uStat(u, 'takenCount') + ' / ' + this.uStat(u, 'doneCount'),
        '注册时间：' + this.joinedLabel(u)
      ]
      uni.showModal({
        title: (u.nickname || u.name || '账号') + ' 的资料',
        content: lines.join('\n'),
        showCancel: false,
        confirmText: '关闭'
      })
    },
    async manage(u, action, value) {
      const labels = {
        ban: '封禁账号',
        unban: '解封账号',
        setAdmin: '设为管理员',
        unsetAdmin: '取消管理员',
        resetPassword: '重置密码'
      }
      uni.showModal({
        title: labels[action] || '确认操作',
        content: `确定对「${u.nickname || u.name || u.username}」执行「${labels[action] || action}」吗？`,
        confirmColor: action === 'ban' || action === 'unsetAdmin' ? '#F04A4A' : '#4C6FFF',
        success: async (res) => {
          if (!res.confirm) return
          const r = await adminManageUser(u.id, action, value)
          uni.showToast({ title: r.msg, icon: 'none' })
          if (r.ok) this.loadUsers()
        }
      })
    },
    editCredit(u) {
      uni.showModal({
        title: '调整信誉分',
        content: '',
        editable: true,
        placeholderText: '输入 0-100 的数字（低于 60 将禁止交易）',
        success: async (res) => {
          if (!res.confirm) return
          const raw = String(res.content || '').trim()
          if (!/^\d{1,3}$/.test(raw) || Number(raw) > 100) {
            uni.showToast({ title: '请输入 0-100 的整数', icon: 'none' })
            return
          }
          const r = await adminManageUser(u.id, 'setCredit', raw)
          uni.showToast({ title: r.msg, icon: 'none' })
          if (r.ok) this.loadUsers()
        }
      })
    },
    moreActions(u) {
      const isAdminRole = u.role === 'admin'
      const items = [
        isAdminRole ? '取消管理员身份' : '设为管理员',
        '重置密码为 123456',
        '调整信誉分',
        '查看完整资料'
      ]
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          const i = res.tapIndex
          if (i === 0) this.manage(u, isAdminRole ? 'unsetAdmin' : 'setAdmin')
          else if (i === 1) this.manage(u, 'resetPassword')
          else if (i === 2) this.editCredit(u)
          else if (i === 3) this.showUser(u)
        }
      })
    },
    buildOrders() {
      const all = listAllTasks()
      const count = (k) => (k === 'all' ? all.length : all.filter((t) => t.status === k).length)
      this.orderFilters = [
        { key: 'all', label: '全部', count: all.length },
        { key: 'pending', label: '待接单', count: count('pending') },
        { key: 'assigned', label: '已接单', count: count('assigned') },
        { key: 'working', label: '进行中', count: count('working') },
        { key: 'submitted', label: '待验收', count: count('submitted') },
        { key: 'done', label: '已完成', count: count('done') },
        { key: 'cancelled', label: '已取消', count: count('cancelled') }
      ]
      this.orderList =
        this.orderFilter === 'all' ? all : all.filter((t) => t.status === this.orderFilter)
    },
    openTask(id) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + id })
    },
    barWidth(n) {
      const max = this.stats.maxHot || 1
      return Math.round((n / max) * 100) + '%'
    },
    pass(t) {
      const r = auditTask(t.id, true)
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    },
    reject(t) {
      uni.showModal({
        title: '驳回委托',
        editable: true,
        placeholderText: '填写驳回原因，例：代写作业属于禁止行为',
        success: (res) => {
          if (!res.confirm) return
          const reason = String(res.content || '').trim() || '不符合平台规范'
          const r = auditTask(t.id, false, reason)
          uni.showToast({ title: r.msg, icon: 'none' })
          this.refresh()
        }
      })
    },
    ban(u) {
      this.manage(u, u.status === 'banned' ? 'unban' : 'ban')
    },
    resolve(d, action) {
      uni.showModal({
        title: action === 'reject' ? '驳回申诉' : '判定违约',
        editable: true,
        placeholderText: action === 'reject' ? '填写驳回理由' : '填写处理说明，会通知申诉人',
        success: (res) => {
          if (!res.confirm) return
          const r = resolveDispute(d.id, { action, reply: res.content })
          uni.showToast({ title: r.msg, icon: 'none' })
          this.refresh()
        }
      })
    },
    addCat() {
      const r = addCategory(this.newCat)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.newCat = { emoji: '', name: '' }
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    },
    delCat(c) {
      uni.showModal({
        title: '删除分类',
        content: `确定删除「${c.name}」吗？`,
        confirmColor: '#F04A4A',
        success: (res) => {
          if (!res.confirm) return
          const r = removeCategory(c.key)
          uni.showToast({ title: r.msg, icon: 'none' })
          this.refresh()
        }
      })
    },
    publish() {
      const r = publishAnnouncement(this.ann)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.ann = { title: '', body: '' }
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    }
  }
}
</script>

<style scoped>
.tabs {
  width: 100%;
  white-space: nowrap;
  background-color: #ffffff;
}
.tabs-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 24rpx;
}
.tab {
  font-size: 25rpx;
  color: #8b90a3;
  font-weight: 600;
  padding: 24rpx 20rpx 20rpx;
  border-bottom: 4rpx solid transparent;
  flex-shrink: 0;
}
.tab-on {
  color: #4c6fff;
  border-bottom-color: #4c6fff;
}
.tab-badge {
  font-size: 18rpx;
  color: #ffffff;
  background-color: #f04a4a;
  padding: 1rpx 8rpx;
  border-radius: 999rpx;
  margin-left: 6rpx;
}
.body {
  padding: 24rpx 32rpx 60rpx;
}
.grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.stat-card {
  width: 31.5%;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 12rpx;
  margin-right: 2.75%;
  margin-bottom: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(76, 111, 255, 0.06);
  box-sizing: border-box;
}
.stat-card:nth-child(3n) {
  margin-right: 0;
}
.stat-num {
  font-size: 38rpx;
  font-weight: 800;
  color: #14161f;
  line-height: 1.1;
}
.accent {
  color: #ff8a3d;
}
.mint {
  color: #21c7a8;
}
.warn {
  color: #ff8a3d;
}
.danger {
  color: #f04a4a;
}
.stat-label {
  font-size: 19rpx;
  color: #8b90a3;
  margin-top: 8rpx;
}
.card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 26rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 8rpx 24rpx rgba(76, 111, 255, 0.06);
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 18rpx;
}
.mb-0 {
  margin-bottom: 0;
}
.amount {
  font-size: 34rpx;
  font-weight: 800;
  color: #ff8a3d;
}
.hint {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 12rpx;
  line-height: 1.5;
}
.hot {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 16rpx;
}
.hot-name {
  width: 180rpx;
  font-size: 22rpx;
  color: #4a4f63;
}
.hot-bar-wrap {
  flex: 1;
  height: 16rpx;
  background-color: #f2f4fa;
  border-radius: 999rpx;
  overflow: hidden;
  margin: 0 16rpx;
}
.hot-bar {
  height: 16rpx;
  border-radius: 999rpx;
}
.hot-count {
  font-size: 21rpx;
  color: #8b90a3;
  width: 50rpx;
  text-align: right;
}
.card-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
}
.card-desc {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.55;
  margin-top: 10rpx;
}
.meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 10rpx;
}
.meta-item {
  font-size: 20rpx;
  color: #8b90a3;
  background-color: #f5f7fb;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 8rpx;
}
.warn-text {
  color: #ff8a3d;
  background-color: #fff2e8;
}
.btn-sm {
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
}
.btn-text-dark {
  font-size: 24rpx;
  font-weight: 600;
  color: #4a4f63;
}
.btn-text-white {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}
.btn-text-blue {
  font-size: 24rpx;
  font-weight: 700;
  color: #4c6fff;
}
.search {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 80rpx;
  background-color: #ffffff;
  border-radius: 999rpx;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
}
.search-icon {
  font-size: 24rpx;
  margin-right: 10rpx;
}
.search-input {
  flex: 1;
  font-size: 25rpx;
  color: #14161f;
}
.ph {
  color: #b6bac9;
  font-size: 24rpx;
}
.user-card {
  padding: 24rpx;
}
.u-avatar {
  font-size: 46rpx;
  margin-right: 18rpx;
}
.u-name {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
  margin-right: 10rpx;
}
.u-sub {
  font-size: 20rpx;
  color: #8b90a3;
  margin-top: 3rpx;
}
.u-right {
  align-items: center;
}
.u-credit {
  font-size: 30rpx;
  font-weight: 800;
  color: #4c6fff;
  line-height: 1.1;
}
.u-credit-label {
  font-size: 17rpx;
  color: #b6bac9;
}
.u-stats {
  font-size: 20rpx;
  color: #8b90a3;
}
.banned {
  background-color: #fcebeb;
  color: #f04a4a;
}
/* 用户管理：筛选 / 完整信息 / 操作 */
.u-filters {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 18rpx;
}
.u-filter {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background-color: #ffffff;
  margin: 0 12rpx 12rpx 0;
  border: 2rpx solid #edeff6;
}
.u-filter-on {
  background-color: #eef1ff;
  border-color: #c9d5ff;
}
.u-filter-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #4a4f63;
}
.u-filter-on .u-filter-text {
  color: #4c6fff;
}
.u-name-row {
  align-items: center;
  flex-wrap: wrap;
}
.u-role-admin {
  background-color: #eef1ff;
  color: #4c6fff;
}
.u-role-self {
  background-color: #eef7f1;
  color: #21a37a;
}
.u-info {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  background-color: #f7f9ff;
  border-radius: 16rpx;
  padding: 14rpx 18rpx;
  margin-top: 20rpx;
}
.u-info-item {
  font-size: 21rpx;
  color: #4a4f63;
  margin-right: 22rpx;
}
.u-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 18rpx;
}
.u-actions .btn {
  margin: 0 12rpx 10rpx 0;
}
.u-manage-btn {
  background-color: #4c6fff;
}
.u-manage-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}
.reason {
  margin-top: 14rpx;
  background-color: #f7f8fc;
  border-radius: 12rpx;
  padding: 16rpx;
}
.reason-text {
  font-size: 23rpx;
  color: #4a4f63;
  line-height: 1.55;
}
.reply {
  margin-top: 14rpx;
  background-color: #e6faf6;
  border-radius: 12rpx;
  padding: 16rpx;
}
.reply-text {
  font-size: 22rpx;
  color: #17977f;
  line-height: 1.5;
}
.input {
  height: 80rpx;
  line-height: 80rpx;
  background-color: #f7f8fc;
  border-radius: 14rpx;
  padding: 0 20rpx;
  font-size: 25rpx;
  color: #14161f;
  box-sizing: border-box;
}
.cat-emoji-input {
  width: 90rpx;
  text-align: center;
  margin-right: 12rpx;
}
.textarea {
  width: 100%;
  height: 160rpx;
  background-color: #f7f8fc;
  border-radius: 14rpx;
  padding: 18rpx;
  font-size: 25rpx;
  color: #14161f;
  box-sizing: border-box;
}
.cat-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 26rpx;
}
.cat-emoji {
  font-size: 30rpx;
  margin-right: 14rpx;
}
.cat-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #14161f;
}
.cat-del {
  font-size: 22rpx;
  color: #f04a4a;
  padding: 8rpx 12rpx;
}
.section-head {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin: 28rpx 0 16rpx;
}
.section-title-sm {
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
}
.section-sub {
  font-size: 21rpx;
  color: #b6bac9;
}
.ml-16 {
  margin-left: 16rpx;
}
.filters {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 18rpx;
}
.filters-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.filter {
  height: 58rpx;
  padding: 0 22rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border: 2rpx solid #edeff6;
}
.filter-on {
  background-color: #4c6fff;
  border-color: #4c6fff;
}
.filter-text {
  font-size: 22rpx;
  color: #8b90a3;
  font-weight: 600;
}
.filter-text-on {
  color: #ffffff;
}
.filter-count {
  font-size: 18rpx;
  margin-left: 4rpx;
  opacity: 0.8;
}
.order-card {
  padding: 24rpx;
}
.order-detail {
  font-size: 21rpx;
  color: #4c6fff;
}
</style>
