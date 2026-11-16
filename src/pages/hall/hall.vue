<template>
  <view class="cc-page" :class="{ 'has-side': isDesktop }" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchcancel="onTouchCancel">
    <!-- 吸顶导航：滚动时 背景色 / 阴影 / 高度 平滑过渡（280ms ease-out） -->
    <view class="topbar" :class="{ 'topbar-scrolled': scrolled }">
      <text class="topbar-title">委托大厅</text>
      <view v-if="isDesktop" class="topbar-links" id="topbarLinks">
        <!-- 滑动指示条：跟随滚动/点击在标签间平移 -->
        <view class="topbar-ind" :style="indStyle"></view>
        <text
          v-for="c in categories"
          :key="c.key"
          class="topbar-link"
          :class="{ 'on': activeCat === c.key }"
          @tap="scrollToCat(c.key)"
        >{{ c.name }}</text>
      </view>
      <view class="topbar-right">
        <view v-if="isDesktop" class="credit-chip" @tap="goMine">
          <text class="credit-label">信誉</text>
          <text class="credit-num">{{ me ? me.credit : '--' }}</text>
        </view>
        <view class="topbar-avatar" @tap="goMine">
          <Avatar :value="me ? me.avatar : '🙂'" :size="56" bg="#eef1ff" />
        </view>
        <view v-if="isDesktop" class="topbar-publish" @tap="goPublish">
          <text class="topbar-publish-text">＋ 发布</text>
        </view>
      </view>
    </view>

    <!-- Hero：问候 + 标题 + 搜索 + 快捷意图 -->
    <view class="hero-wrap">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="hero">
        <text class="hero-kicker">{{ greeting }}，{{ me ? me.nickname || me.name : '同学' }}</text>
        <text class="hero-title">今天需要帮忙做点什么？</text>
        <view class="ai-search" @tap="goSearch">
          <text class="search-icon">🔍</text>
          <text class="ai-placeholder">搜索委托：标题、地点、要求…</text>
        </view>
      </view>
    </view>

    <!-- 我的数据：4 张统计卡 -->
    <view class="stats-wrap">
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-num">{{ my.publishedCount }}</text>
          <text class="stat-label">我发布的</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ my.takenCount }}</text>
          <text class="stat-label">我接取的</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ my.doneCount }}</text>
          <text class="stat-label">我完成的</text>
        </view>
        <view class="stat-card">
          <text class="stat-num" :class="{ 'stat-num-dim': !my.avgStars }">{{ my.avgStars || '暂无' }}</text>
          <text class="stat-label">我的评分</text>
        </view>
      </view>
    </view>

    <!-- 公告 -->
    <view v-if="announcement" class="notice" @tap="goRules">
      <text class="notice-tag">公告</text>
      <text class="notice-text ellipsis">{{ announcement.title }}</text>
      <text class="notice-arrow">›</text>
    </view>

    <!-- 分类分区：滚动时联动顶栏指示条 -->
    <view class="list">
      <view v-for="sec in sections" :key="sec.key" class="cat-section">
        <view class="section-head">
          <text class="section-title">{{ sec.emoji }} {{ sec.name }}</text>
          <text class="section-count">{{ sec.tasks.length }} 条</text>
        </view>

        <!-- 桌面端：扁平行（悬停上浮） -->
        <view v-if="isDesktop" class="rows">
          <view v-for="t in sec.tasks" :key="t.id" class="row" @tap="openTask(t)">
            <text class="row-ico">{{ t.cat.emoji }}</text>
            <view class="row-main">
              <text class="row-title">{{ t.title }}</text>
              <view class="row-meta">
                <text class="row-status" :style="{ color: statusColor(t) }">{{ statusText(t) }}</text>
                <text class="row-sep">·</text>
                <text class="row-meta-text">{{ t.place }}</text>
                <text class="row-sep">·</text>
                <text class="row-meta-text">{{ t.deadlineLabel }}</text>
              </view>
            </view>
            <text class="row-price">{{ t.budgetLabel }}</text>
          </view>
        </view>

        <!-- 手机端：卡片（点按上浮） -->
        <view v-else class="cards">
          <view v-for="t in sec.tasks" :key="t.id" class="mcard" @tap="openTask(t)">
            <view class="mcard-head">
              <text class="mcard-title">{{ t.title }}</text>
              <text class="mcard-status" :style="{ color: statusColor(t) }">{{ statusText(t) }}</text>
            </view>
            <view class="mcard-meta">
              <text>{{ t.place }}</text>
              <text class="mcard-dot">·</text>
              <text>{{ t.deadlineLabel }}</text>
            </view>
            <view class="mcard-foot">
              <text class="mcard-price">{{ t.budgetLabel }}</text>
              <text class="mcard-cta">查看 ›</text>
            </view>
          </view>
        </view>

        <view v-if="!sec.tasks.length" class="section-empty">这个分类暂时没有委托</view>
      </view>

      <EmptyState
        v-if="!totalTasks"
        emoji="🔍"
        title="没有找到相关委托"
        desc="换个关键词试试，也可以自己发一条"
        action-text="去发布委托"
        @action="goPublish"
      />
    </view>

    <SideNav v-if="isDesktop" active="hall" :unread="unread" />
    <TabBar v-else active="hall" :unread="unread" />
  </view>
</template>

<script>
import TabBar from '../../components/TabBar.vue'
import SideNav from '../../components/SideNav.vue'
import EmptyState from '../../components/EmptyState.vue'
import Avatar from '../../components/Avatar.vue'
import { isDesktopNow } from '../../utils/device.js'
import { pullState } from '../../utils/sync.js'
import {
  listTasks,
  listCategories,
  listAnnouncements,
  currentUser,
  guardLogin,
  myStats,
  unreadCount,
  dataTick
} from '../../utils/store.js'

export default {
  components: { TabBar, SideNav, EmptyState, Avatar },
  data() {
    return {
      statusBarHeight: 0,
      isDesktop: false,
      scrolled: false,
      categories: [],
      keyword: '',
      building: 'all',
      sort: 'smart',
      unread: 0,
      // 滚动联动
      activeCat: '',
      indStyle: 'width:0;transform:translateX(0)',
      tabRects: [],
      sectionTops: [],
      topbarH: 56,
      scrollTop: 0,
      vh: 0,
      pageH: 0,
      intents: [
        '今晚 8 点前把奶茶送到 3 号楼',
        '帮我从东门取两个快递',
        '找人帮忙剪个 2 分钟短片'
      ]
    }
  },
  computed: {
    me() {
      dataTick.value
      const u = currentUser()
      return u ? { ...u } : null
    },
    avatarChar() {
      const m = this.me
      if (!m) return '我'
      const n = m.nickname || m.name || '我'
      return String(n).slice(0, 1)
    },
    greeting() {
      const h = new Date().getHours()
      if (h < 6) return '夜深了'
      if (h < 12) return '早上好'
      if (h < 14) return '中午好'
      if (h < 19) return '下午好'
      return '晚上好'
    },
    // 按分类分组：大厅只展示「待接单 + 未过期」的可接取订单
    sections() {
      dataTick.value
      const all = listTasks({
        building: this.building,
        keyword: this.keyword,
        sort: this.sort,
        status: 'pending'
      }).filter((t) => !t.expired)
      return this.categories.map((c) => {
        const tasks = all.filter((t) => t.category === c.key)
        return { key: c.key, name: c.name, emoji: c.emoji, tasks }
      })
    },
    totalTasks() {
      return this.sections.reduce((n, s) => n + s.tasks.length, 0)
    },
    my() {
      dataTick.value
      return myStats()
    },
    announcement() {
      dataTick.value
      const list = listAnnouncements()
      return list.length ? list[0] : null
    }
  },
  watch: {
    keyword() {
      this.$nextTick(() => setTimeout(() => this.measure(), 80))
    }
  },
  onLoad() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
    this.isDesktop = isDesktopNow()
    if (!guardLogin()) return
    this.categories = listCategories()
    this.refreshUnread()
  },
  onReady() {
    this.$nextTick(() => {
      this.measure()
      setTimeout(() => this.measure(), 160)
    })
    if (typeof window !== 'undefined') {
      this._onResize = () => this.measure()
      window.addEventListener('resize', this._onResize)
    }
  },
  onShow() {
    if (!guardLogin()) return
    this.categories = listCategories()
    this.refreshUnread()
    this.$nextTick(() => setTimeout(() => this.measure(), 120))
  },
  // 下拉刷新：无论成功失败都要 stopPullDownRefresh，否则会一直转圈
  async onPullDownRefresh() {
    try {
      // 最多等 3 秒，防止后端卡住导致一直转圈
      await Promise.race([pullState(), new Promise((resolve) => setTimeout(resolve, 3000))])
    } catch (e) {
      // 后端不可用时忽略，仍用本地数据刷新
    }
    try {
      this.categories = listCategories()
      this.refreshUnread()
      this.$nextTick(() => setTimeout(() => this.measure(), 60))
    } finally {
      uni.stopPullDownRefresh()
    }
  },
  onUnload() {
    if (typeof window !== 'undefined' && this._onResize) {
      window.removeEventListener('resize', this._onResize)
    }
  },
  onPageScroll(e) {
    this.scrolled = (e && e.scrollTop ? e.scrollTop : 0) > 8
    this.scrollTop = (e && e.scrollTop) || 0
    this.updateActiveByScroll()
  },
  methods: {
    refreshUnread() {
      this.unread = unreadCount()
    },
    // 滑动时手指移动超过阈值，就不把手抬起时的 click 当成点击，避免误打开页面
    onTouchStart(e) {
      const t = e.touches && e.touches[0]
      this._touchX = t ? t.clientX : 0
      this._touchY = t ? t.clientY : 0
      this._moved = false
    },
    onTouchMove(e) {
      const t = e.touches && e.touches[0]
      if (!t) return
      if (Math.abs(t.clientY - this._touchY) > 10 || Math.abs(t.clientX - this._touchX) > 10) {
        this._moved = true
      }
    },
    onTouchCancel() {
      // 手势被系统打断（来电、切换应用等），本次不算点击
      this._moved = true
    },
    isTap() {
      return !this._moved
    },
    goSearch() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/search/search' })
    },
    /* 测量标签与分区位置（H5） */
    measure() {
      if (typeof document === 'undefined') return
      const linksEl = document.getElementById('topbarLinks')
      if (!linksEl) return
      const tabEls = linksEl.querySelectorAll('.topbar-link')
      if (!tabEls.length) return
      const linksRect = linksEl.getBoundingClientRect()
      const rects = []
      for (let i = 0; i < tabEls.length; i++) {
        const r = tabEls[i].getBoundingClientRect()
        rects.push({ left: r.left - linksRect.left, width: r.width })
      }
      this.tabRects = rects
      const topbarEl = document.querySelector('.topbar')
      if (topbarEl) this.topbarH = topbarEl.getBoundingClientRect().height
      const secEls = document.querySelectorAll('.cat-section')
      const sy = this.scrollTop || (typeof window !== 'undefined' ? window.scrollY : 0) || 0
      const tops = []
      for (let i = 0; i < secEls.length; i++) {
        tops.push(secEls[i].getBoundingClientRect().top + sy)
      }
      this.sectionTops = tops
      if (typeof window !== 'undefined') {
        this.vh = window.innerHeight || 0
        this.pageH = document.documentElement ? document.documentElement.scrollHeight : 0
      }
      if (!this.activeCat && this.categories.length) this.activeCat = this.categories[0].key
      this.updateIndicator()
      this.updateActiveByScroll()
    },
    /* 指示条平移到当前标签 */
    updateIndicator() {
      const i = this.categories.findIndex((c) => c.key === this.activeCat)
      const r = this.tabRects[i]
      if (!r) return
      this.indStyle = 'width:' + r.width + 'px;transform:translateX(' + r.left + 'px);'
    },
    /* 滚动到哪个分区，激活对应标签 */
    updateActiveByScroll() {
      if (!this.sectionTops.length || !this.categories.length) return
      const last = this.categories.length - 1
      let idx = 0
      // 已经滚到底部：直接选中最后一个分类（短页面也能高亮最后一项）
      if (this.vh && this.pageH && this.scrollTop + this.vh >= this.pageH - 8) {
        idx = last
      } else {
        const line = this.scrollTop + this.topbarH + 24
        for (let i = 0; i < this.sectionTops.length; i++) {
          if (this.sectionTops[i] <= line) idx = i
        }
      }
      const key = this.categories[idx] && this.categories[idx].key
      if (key && key !== this.activeCat) {
        this.activeCat = key
        this.updateIndicator()
      }
    },
    /* 点击标签：平滑滚动到对应分区 */
    scrollToCat(key) {
      if (!this.isTap()) return
      this.activeCat = key
      this.updateIndicator()
      const i = this.categories.findIndex((c) => c.key === key)
      const top = this.sectionTops[i]
      if (top != null) {
        uni.pageScrollTo({ scrollTop: Math.max(0, top - this.topbarH - 8), duration: 280 })
      }
    },
    goPublish() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/publish/publish' })
    },
    goPublishWith(text) {
      if (!this.isTap()) return
      const t = String(text || '').trim()
      if (!t) {
        uni.showToast({ title: '先说一句你想让人帮什么', icon: 'none' })
        return
      }
      uni.navigateTo({ url: '/pages/publish/publish?text=' + encodeURIComponent(t) })
    },
    useIntent(t) {
      this.goPublishWith(t)
    },
    goMine() {
      if (!this.isTap()) return
      uni.reLaunch({ url: '/pages/mine/mine' })
    },
    goRules() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/rules/rules' })
    },
    openTask(t) {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/detail/detail?id=' + t.id })
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
/* ============ 吸顶导航（滚动过渡 280ms ease-out） ============ */
.topbar {
  position: sticky;
  top: 0;
  z-index: 80;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  background-color: rgba(245, 247, 251, 0);
  border-bottom: 2rpx solid transparent;
  transition: height 280ms cubic-bezier(0, 0, 0.58, 1),
    background-color 280ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 280ms cubic-bezier(0, 0, 0.58, 1),
    border-color 280ms cubic-bezier(0, 0, 0.58, 1);
}
.topbar-scrolled {
  height: 96rpx;
  background-color: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8rpx 24rpx rgba(20, 22, 31, 0.06);
  border-bottom-color: #edeff6;
}
.topbar-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #14161f;
  letter-spacing: -0.3rpx;
  white-space: nowrap;
}
.topbar-links {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 40rpx;
}
/* 滑动指示条 */
.topbar-ind {
  position: absolute;
  left: 0;
  bottom: 2rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background-color: #4c6fff;
  box-shadow: 0 2rpx 6rpx rgba(76, 111, 255, 0.4);
  transition: transform 280ms cubic-bezier(0, 0, 0.58, 1),
    width 280ms cubic-bezier(0, 0, 0.58, 1);
  pointer-events: none;
}
.topbar-link {
  position: relative;
  font-size: 26rpx;
  color: #6b7080;
  margin-right: 40rpx;
  padding: 8rpx 0;
  transition: color 280ms cubic-bezier(0, 0, 0.58, 1);
}
.topbar-link.on {
  color: #14161f;
  font-weight: 700;
}
.topbar-right {
  margin-left: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.credit-chip {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 48rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  background-color: #ffffff;
  border: 2rpx solid #e2e8f0;
  margin-right: 16rpx;
}
.credit-label {
  font-size: 22rpx;
  color: #64748b;
  margin-right: 6rpx;
}
.credit-num {
  font-size: 26rpx;
  font-weight: 700;
  color: #2563eb;
}
.topbar-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  box-shadow: 0 4rpx 10rpx rgba(15, 23, 42, 0.12);
}
.topbar-avatar-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #4c6fff;
}
.ai-placeholder {
  flex: 1;
  font-size: 26rpx;
  color: #94a3b8;
}
.topbar-publish {
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background-image: linear-gradient(135deg, #5b7cff, #3355e8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(76, 111, 255, 0.3);
}
.topbar-publish:active {
  transform: scale(0.96);
}
.topbar-publish-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

/* ============ Hero ============ */
.hero-wrap {
  padding: 0 32rpx;
}
.hero {
  padding: 22rpx 8rpx 8rpx;
  box-sizing: border-box;
}
.hero-kicker {
  display: block;
  font-size: 26rpx;
  color: #64748b;
}
.hero-title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: #0f172a;
  margin-top: 8rpx;
  letter-spacing: -0.5rpx;
}
.ai-search {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 88rpx;
  margin-top: 22rpx;
  padding: 0 12rpx 0 18rpx;
  background-color: #ffffff;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  box-sizing: border-box;
}
.search-icon {
  font-size: 15px;
  margin-right: 8px;
}
.ai-input {
  flex: 1;
  font-size: 28rpx;
  color: #0f172a;
}
.ai-ph {
  color: #94a3b8;
  font-size: 26rpx;
}
.ai-clear {
  font-size: 24rpx;
  color: #94a3b8;
  padding: 0 10rpx;
}
.intent-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 14rpx;
}
.intent {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 18rpx;
  margin-right: 12rpx;
  margin-bottom: 10rpx;
  border-radius: 16rpx;
  background-color: #ffffff;
  border: 2rpx solid #e2e8f0;
  font-size: 24rpx;
  color: #64748b;
}

/* ============ 统计卡 ============ */
.stats-wrap {
  padding: 0 32rpx;
  margin-top: 20rpx;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.stat-card {
  background-color: #ffffff;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 22rpx 20rpx;
  box-sizing: border-box;
  box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
}
.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}
.stat-num-dim {
  font-size: 28rpx;
  color: #94a3b8;
}
.stat-label {
  display: block;
  font-size: 22rpx;
  color: #64748b;
  margin-top: 6rpx;
}

/* ============ 公告 ============ */
.notice {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 20rpx 32rpx 0;
  padding: 18rpx 22rpx;
  background-color: #fff8ee;
  border-radius: 18rpx;
}
.notice-tag {
  font-size: 19rpx;
  color: #ffffff;
  background-color: #ff8a3d;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
}
.notice-text {
  flex: 1;
  font-size: 23rpx;
  color: #a8621f;
}
.notice-arrow {
  font-size: 28rpx;
  color: #d9a06a;
  margin-left: 8rpx;
}

/* ============ 分类分区 ============ */
.list {
  padding: 0 32rpx 220rpx;
}
.cat-section {
  margin-top: 26rpx;
}
.section-head {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  margin-bottom: 10rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
}
.section-count {
  margin-left: auto;
  font-size: 22rpx;
  color: #94a3b8;
}
.section-empty {
  font-size: 23rpx;
  color: #b6bac9;
  padding: 16rpx 8rpx;
}

/* 桌面端委托卡：每行两个 */
.rows {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 24rpx;
  row-gap: 24rpx;
}
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border: 2rpx solid rgba(226, 232, 240, 0.9);
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  box-sizing: border-box;
  box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
  transition: transform 280ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 280ms cubic-bezier(0, 0, 0.58, 1);
}
@media (hover: hover) {
  .row:hover {
    transform: translateY(-4rpx) scale(1.008);
    box-shadow: 0 16rpx 34rpx rgba(37, 99, 235, 0.13);
  }
}
.row-ico {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background-color: #f1f5f9;
  text-align: center;
  line-height: 64rpx;
  font-size: 30rpx;
  margin-right: 18rpx;
  flex: none;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 6rpx;
}
.row-status {
  font-size: 22rpx;
  font-weight: 700;
}
.row-sep {
  font-size: 22rpx;
  color: #cbd5e1;
  margin: 0 10rpx;
}
.row-meta-text {
  font-size: 22rpx;
  color: #64748b;
}
.row-price {
  margin-left: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
  flex: none;
}

/* 手机端卡片（点按上浮 + 边缘立体化） */
.cards {
  display: flex;
  flex-direction: column;
}
.mcard {
  background-color: #ffffff;
  border: 2rpx solid rgba(226, 232, 240, 0.9);
  border-radius: 24rpx;
  padding: 24rpx 26rpx;
  margin-bottom: 24rpx;
  box-sizing: border-box;
  box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.055);
  transition: transform 280ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 280ms cubic-bezier(0, 0, 0.58, 1);
}
.mcard:active {
  transform: translateY(-3rpx) scale(1.01);
  box-shadow: 0 16rpx 34rpx rgba(37, 99, 235, 0.14);
}
.mcard-head {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.mcard-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mcard-status {
  font-size: 22rpx;
  font-weight: 700;
  margin-left: 12rpx;
  flex: none;
}
.mcard-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 12rpx;
  font-size: 23rpx;
  color: #64748b;
}
.mcard-dot {
  margin: 0 10rpx;
  color: #cbd5e1;
}
.mcard-foot {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f1f5f9;
}
.mcard-price {
  font-size: 32rpx;
  font-weight: 800;
  color: #0f172a;
}
.mcard-cta {
  margin-left: auto;
  font-size: 24rpx;
  font-weight: 700;
  color: #4c6fff;
}

/* 窄屏：统计卡两列 */
@media screen and (max-width: 899px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-title {
    font-size: 38rpx;
  }
}
</style>
