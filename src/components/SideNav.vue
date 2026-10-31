<template>
  <view class="sidenav" :class="{ 'sn-collapsed': collapsed }">
    <view class="sn-brand" @tap="goMine">
      <view class="sn-mark">
        <text class="sn-mark-text">校</text>
      </view>
      <view class="col">
        <text class="sn-name">校园委托</text>
        <text class="sn-slogan">放心托付 · 靠谱接单</text>
      </view>
      <view class="sn-toggle" @tap.stop="toggleCollapse">
        <text class="sn-toggle-icon">{{ collapsed ? '›' : '‹' }}</text>
      </view>
    </view>

    <view class="sn-menu">
      <view class="sn-ind" :style="{ transform: 'translateY(' + (activeIndex * 50) + 'px)' }"></view>
      <view
        v-for="item in items"
        :key="item.key"
        class="sn-item"
        :class="{ 'sn-item-on': active === item.key }"
        @tap="go(item)"
      >
        <text class="sn-emoji">{{ item.emoji }}</text>
        <text class="sn-label" :class="{ 'sn-label-on': active === item.key }">{{ item.label }}</text>
        <view v-if="item.key === 'chat' && unreadNum > 0" class="sn-badge">
          <text class="sn-badge-text">{{ unreadNum > 99 ? '99+' : unreadNum }}</text>
        </view>
      </view>
    </view>

    <view class="sn-foot">
      <view v-if="me" class="sn-user" @tap="goMine">
        <Avatar :value="me.avatar" :size="56" />
        <view class="col flex1 sn-user-info">
          <text class="sn-user-name">{{ me.nickname || me.name }}</text>
          <text class="sn-user-sub">信誉分 {{ me.credit }}</text>
        </view>
      </view>
      <view v-if="adminMode" class="sn-admin" @tap="goAdmin">
        <text class="sn-admin-text">⚙ 管理后台</text>
      </view>
    </view>
  </view>
</template>

<script>
import Avatar from './Avatar.vue'
import { currentUser, isAdmin as isAdminUser, unreadCount } from '../utils/store.js'

export default {
  name: 'SideNav',
  components: { Avatar },
  props: {
    active: { type: String, default: '' },
    unread: { type: Number, default: -1 }
  },
  data() {
    return {
      collapsed: false,
      items: [
        { key: 'hall', label: '委托大厅', emoji: '🏠', path: '/pages/hall/hall' },
        { key: 'chat', label: '消息', emoji: '💬', path: '/pages/chat/chat' },
        { key: 'publish', label: '发布委托', emoji: '✏️', path: '/pages/publish/publish' },
        { key: 'mine', label: '个人中心', emoji: '👤', path: '/pages/mine/mine' }
      ]
    }
  },
  computed: {
    activeIndex() {
      const i = this.items.findIndex((it) => it.key === this.active)
      return i < 0 ? 0 : i
    },
    me() {
      return currentUser()
    },
    adminMode() {
      return isAdminUser()
    },
    unreadNum() {
      return this.unread >= 0 ? this.unread : unreadCount()
    }
  },
  mounted() {
    try {
      if (localStorage.getItem('cc_side_collapsed') === '1') this.applyCollapse(true)
    } catch (e) {}
  },
  methods: {
    go(item) {
      if (item.key === this.active) return
      if (item.key === 'publish') {
        uni.navigateTo({ url: item.path })
        return
      }
      uni.reLaunch({ url: item.path })
    },
    goMine() {
      if (this.active === 'mine') return
      uni.reLaunch({ url: '/pages/mine/mine' })
    },
    goAdmin() {
      uni.navigateTo({ url: '/pages/admin/admin' })
    },
    toggleCollapse() {
      this.applyCollapse(!this.collapsed)
    },
    applyCollapse(v) {
      this.collapsed = v
      try {
        localStorage.setItem('cc_side_collapsed', v ? '1' : '0')
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.style.setProperty('--cc-side-w', v ? '76px' : '232px')
        }
      } catch (e) {}
    }
  }
}
</script>

<style scoped>
.sidenav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--cc-side-w, 232px);
  z-index: 95;
  background-color: #ffffff;
  border-right: 1px solid #edeff6;
  display: flex;
  flex-direction: column;
  padding: 26px 16px 18px;
  box-sizing: border-box;
  overflow: hidden;
  transition: width 280ms cubic-bezier(0, 0, 0.58, 1);
}

.sn-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 6px 22px;
}
.sn-mark {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-image: linear-gradient(135deg, #5b7cff, #3355e8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  box-shadow: 0 6px 16px rgba(76, 111, 255, 0.28);
}
.sn-mark-text {
  font-size: 19px;
  font-weight: 800;
  color: #ffffff;
}
.sn-name {
  font-size: 16px;
  font-weight: 800;
  color: #14161f;
  letter-spacing: 0.5px;
}
.sn-slogan {
  font-size: 10.5px;
  color: #b6bac9;
  margin-top: 2px;
}
.sn-toggle {
  margin-left: auto;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background-color: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 280ms cubic-bezier(0, 0, 0.58, 1);
}
.sn-toggle:active {
  background-color: #eef1ff;
}
.sn-toggle-icon {
  font-size: 16px;
  line-height: 1;
  color: #8b90a3;
}

.sn-menu {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-top: 6px;
}
.sn-ind {
  position: absolute;
  left: 0;
  top: 0;
  width: 6rpx;
  height: 46px;
  border-radius: 3rpx;
  background-color: #4c6fff;
  box-shadow: 0 2rpx 6rpx rgba(76, 111, 255, 0.4);
  pointer-events: none;
  z-index: 0;
  transition: transform 280ms cubic-bezier(0, 0, 0.58, 1);
}
.sn-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 46px;
  padding: 0 12px;
  margin-bottom: 4px;
  border-radius: 12px;
}
.sn-item:active {
  background-color: #f5f7fb;
}
.sn-item-on {
  background-color: transparent;
}
.sn-emoji {
  font-size: 16px;
  width: 24px;
}
.sn-label {
  font-size: 14px;
  font-weight: 600;
  color: #4a4f63;
  margin-left: 8px;
}
.sn-label-on {
  color: #4c6fff;
  font-weight: 700;
}
.sn-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background-color: #f04a4a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sn-badge-text {
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
}

.sn-foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f3f4f9;
}
.sn-user {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8px 6px;
  border-radius: 12px;
}
.sn-user:active {
  background-color: #f5f7fb;
}
.sn-user-info {
  margin-left: 10px;
  overflow: hidden;
}
.sn-user-name {
  font-size: 13px;
  font-weight: 700;
  color: #14161f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sn-user-sub {
  font-size: 11px;
  color: #8b90a3;
  margin-top: 2px;
}
.sn-admin {
  margin-top: 8px;
  height: 36px;
  border-radius: 10px;
  background-color: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sn-admin-text {
  font-size: 12.5px;
  font-weight: 600;
  color: #4a4f63;
}

/* 收起态：只留图标，隐藏文字 / 品牌 / 页脚 */
.sn-collapsed .sn-name,
.sn-collapsed .sn-slogan,
.sn-collapsed .sn-mark,
.sn-collapsed .sn-label,
.sn-collapsed .sn-badge,
.sn-collapsed .sn-user,
.sn-collapsed .sn-admin {
  display: none;
}
.sn-collapsed .sn-brand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}
.sn-collapsed .sn-toggle {
  margin-left: 0;
}
.sn-collapsed .sn-item {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}
</style>
