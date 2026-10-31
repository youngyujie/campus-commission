<script>
import { init } from './utils/store.js'
import { bootstrapOnce } from './utils/sync.js'

export default {
  onLaunch() {
    // 首次启动写入演示数据（本地缓存，保证首屏立刻有内容）
    init()
    // 再尝试连后端：连上就切到共享模式，连不上就纯本地
    bootstrapOnce()
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* 只支持浅色：挡住浏览器的「自动深色 / 夜间反色」 */
html,
body,
page,
#app {
  color-scheme: only light;
  background-color: #F7FBF4;
}

/* ============================================================
   校园委托 · 设计令牌（校园活力）
   ============================================================ */
page,
.cc-page {
  --primary: #4c6fff;
  --primary-deep: #3355e8;
  --primary-soft: #eef1ff;
  --accent: #ff8a3d;
  --accent-soft: #fff2e8;
  --mint: #21c7a8;
  --mint-soft: #e6faf6;
  --purple: #7c5cff;
  --purple-soft: #f2eeff;
  --pink: #ff6b9a;
  --pink-soft: #ffedf3;

  --bg: #f5f7fb;
  --card: #ffffff;
  --ink: #14161f;
  --ink-2: #4a4f63;
  --ink-3: #8b90a3;
  --ink-4: #b6bac9;
  --line: #edeff6;

  --r-sm: 12rpx;
  --r-md: 20rpx;
  --r-lg: 28rpx;
  --r-xl: 36rpx;
  --r-pill: 999rpx;

  --sh-card: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
  --sh-float: 0 12rpx 32rpx rgba(76, 111, 255, 0.3);
  --sh-press: 0 4rpx 14rpx rgba(76, 111, 255, 0.18);
}

page {
  background-color: #f5f7fb;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  color: #14161f;
  font-size: 28rpx;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.cc-page {
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg);
  color: var(--ink);
  font-size: 28rpx;
  line-height: 1.5;
}

/* ---------- 布局 ---------- */
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.col {
  display: flex;
  flex-direction: column;
}
.between {
  justify-content: space-between;
}
.center {
  justify-content: center;
  align-items: center;
}
.wrap {
  flex-wrap: wrap;
}
.flex1 {
  flex: 1;
  min-width: 0;
}
/* 小程序 flex gap 支持不一致，统一用 margin 控制间距 */
.mr-8 {
  margin-right: 8rpx;
}
.mr-12 {
  margin-right: 12rpx;
}
.mr-16 {
  margin-right: 16rpx;
}
.mr-20 {
  margin-right: 20rpx;
}
.mt-8 {
  margin-top: 8rpx;
}
.mt-12 {
  margin-top: 12rpx;
}
.mt-16 {
  margin-top: 16rpx;
}
.mt-24 {
  margin-top: 24rpx;
}
.mt-32 {
  margin-top: 32rpx;
}
.ml-auto {
  margin-left: auto;
}

/* ---------- 文字 ---------- */
.t-title {
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--ink);
}
.t-sub {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--ink);
}
.t-body {
  font-size: 28rpx;
  color: var(--ink-2);
}
.t-muted {
  font-size: 24rpx;
  color: var(--ink-3);
}
.t-tiny {
  font-size: 22rpx;
  color: var(--ink-4);
}
.t-num {
  font-variant-numeric: tabular-nums;
}
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* ---------- 卡片 ---------- */
.card {
  background-color: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-card);
  padding: 28rpx;
  box-sizing: border-box;
}
.card-flat {
  background-color: var(--card);
  border-radius: var(--r-lg);
  border: 2rpx solid var(--line);
  padding: 28rpx;
  box-sizing: border-box;
}

/* ---------- 按钮 ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  padding: 0 40rpx;
  border-radius: var(--r-pill);
  font-size: 30rpx;
  font-weight: 600;
  box-sizing: border-box;
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.btn:active {
  transform: scale(0.97);
  opacity: 0.9;
}
.btn-primary {
  background-color: var(--primary);
  color: #ffffff;
  box-shadow: var(--sh-float);
}
.btn-accent {
  background-color: var(--accent);
  color: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(255, 138, 61, 0.3);
}
.btn-ghost {
  background-color: var(--card);
  color: var(--ink-2);
  border: 2rpx solid var(--line);
}
.btn-soft {
  background-color: var(--primary-soft);
  color: var(--primary);
}
.btn-disabled {
  background-color: #e9ebf2;
  color: var(--ink-4);
  box-shadow: none;
}
.btn-block {
  width: 100%;
}

/* ---------- 标签 ---------- */
.pill {
  display: inline-flex;
  align-items: center;
  height: 44rpx;
  padding: 0 18rpx;
  border-radius: var(--r-pill);
  font-size: 22rpx;
  font-weight: 600;
}

/* ---------- 动效 ---------- */
@keyframes cc-fade-up {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fade-up {
  animation: cc-fade-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes cc-pop {
  0% {
    opacity: 0;
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.pop {
  animation: cc-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ============================================================
   桌面端（≥900px）：左侧导航 + 内容限宽，不再被拉满
   ============================================================ */
@media screen and (min-width: 900px) {
  .cc-page.has-side {
    padding-left: var(--cc-side-w, 232px);
    transition: padding-left 280ms cubic-bezier(0, 0, 0.58, 1);
  }

  /* 内容铺满侧栏右侧，只留 28px 呼吸位，不再左右各空 100px+ */
  .cc-page.has-side .hero-wrap,
  .cc-page.has-side .stats-wrap,
  .cc-page.has-side .filter-wrap,
  .cc-page.has-side .list,
  .cc-page.has-side .tabs {
    box-sizing: border-box;
    padding-left: 28px;
    padding-right: 28px;
  }
  .cc-page.has-side .notice {
    margin-left: 28px;
    margin-right: 28px;
  }
  .cc-page.has-side .body {
    box-sizing: border-box;
    padding-left: 28px;
    padding-right: 28px;
  }
  .cc-page.has-side .actionbar-inner {
    max-width: none;
  }

  /* 任务卡双列网格：大厅 / 订单 / 我的 共用 */
  .task-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(360px, 1fr));
    column-gap: 28rpx;
    align-items: start;
  }

  /* 底部操作栏跟着侧边栏让位 */
  .cc-page.has-side .actionbar {
    left: var(--cc-side-w, 232px);
    transition: left 280ms cubic-bezier(0, 0, 0.58, 1);
  }
  .cc-page.has-side .bottom-space {
    height: 120px;
  }

  /* 二级页面（详情 / 聊天室 / 他人主页 / 后台）同样限宽 */
  .cc-page:not(.has-side) .body,
  .cc-page:not(.has-side) .list {
    max-width: 860px;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
  }
  .cc-page:not(.has-side) .actionbar {
    left: 0;
  }
  .cc-page:not(.has-side) .actionbar-inner {
    max-width: 860px;
    margin: 0 auto;
  }
}
</style>
