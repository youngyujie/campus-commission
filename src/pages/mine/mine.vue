<template>
  <view class="cc-page" :class="{ 'has-side': isDesktop }" @touchstart="tgStart" @touchmove="tgMove" @touchcancel="tgCancel">
    <!-- 头部 -->
    <view class="hero">
      <view :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="hero-top">
        <text class="hero-page-title">我的</text>
      </view>

      <view class="profile">
        <view class="avatar-hit" @tap="onAvatarTap">
          <Avatar :value="me.avatar" :size="112" bg="rgba(255,255,255,0.22)" />
        </view>
        <view class="col flex1">
          <view class="row">
            <text class="p-name">{{ me.nickname || me.name }}</text>
            <view class="p-title" :style="{ backgroundColor: title.soft }" @tap.stop="goTitle">
              <text class="p-title-text" :style="{ color: title.color }">{{ title.emoji }} {{ title.name }}</text>
            </view>
          </view>
          <text class="p-sub">{{ me.college || '未填写院系' }} · {{ me.studentId }}</text>
        </view>
        <view class="p-credit">
          <text class="p-credit-num">{{ me.credit }}</text>
          <text class="p-credit-label">信誉分</text>
        </view>
      </view>

      <view class="stats">
        <view class="stat">
          <text class="stat-num">{{ stats.publishedCount }}</text>
          <text class="stat-label">发布</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ stats.takenCount }}</text>
          <text class="stat-label">接取</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ stats.doneCount }}</text>
          <text class="stat-label">完成</text>
        </view>
        <view class="stat">
          <text class="stat-num">{{ stats.avgStars || '暂无' }}</text>
          <text class="stat-label">评分</text>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 学生认证提醒 -->
      <view v-if="!adminMode && !verified" class="card warn-card">
        <view class="row between">
          <view class="col flex1">
            <text class="warn-title">还未完成学生认证</text>
            <text class="warn-sub">当前只能浏览，认证通过后才能发布和接取委托</text>
          </view>
          <view class="mini-btn mini-accent" @tap="goVerify">
            <text class="mini-btn-text white">去认证</text>
          </view>
        </view>
      </view>

      <!-- 押金 -->
      <view v-if="!adminMode" class="card">
        <view class="row between">
          <text class="section-title mb-0">接单押金</text>
          <text class="t-tiny">50 - 200 元 · 验收后返还</text>
        </view>
        <view class="row between mt-16">
          <view class="row">
            <text class="dep-num">¥{{ deposit }}</text>
            <text class="dep-label">可用押金</text>
          </view>
          <view class="mini-btn mini-soft" @tap="openRecharge">
            <text class="mini-btn-text blue">缴纳押金</text>
          </view>
        </view>
        <text class="dep-tip">接单需缴纳不低于订单报酬的押金；押金不足 50 元时需先补交</text>
      </view>

      <!-- 接单开关 -->
      <view class="card switch-card">
        <view class="row between">
          <view class="col flex1">
            <text class="switch-title">接单开关</text>
            <text class="switch-sub">{{ me.accepting ? '当前开放接单，可以给别人的委托报价' : '已暂停接单，暂时不能报价' }}</text>
          </view>
          <switch :checked="me.accepting" color="#4C6FFF" @change="onAccepting" />
        </view>
      </view>

      <!-- 我的资料：点一行改一项，弹层里改，不占主页空间 -->
      <view class="card">
        <view class="row between">
          <text class="section-title mb-0">我的资料</text>
          <text class="t-tiny">点一行改一项</text>
        </view>

        <view class="info-row" @tap="goVerify">
          <text class="info-label">学生认证</text>
          <view class="row">
            <text class="info-value" :class="{ 'ok-text': verified }">{{ verified ? '已认证' : '未认证' }}</text>
            <text class="info-arrow">›</text>
          </view>
        </view>

        <view class="info-row" @tap="goViewed">
          <text class="info-label">浏览记录</text>
          <view class="row">
            <text class="info-value">{{ viewedCount ? viewedCount + ' 条' : '暂无' }}</text>
            <text class="info-arrow">›</text>
          </view>
        </view>

        <view class="info-row" @tap="openField('nickname')">
          <text class="info-label">昵称</text>
          <text class="info-value ellipsis">{{ me.nickname || '未填写' }}</text>
          <text class="info-arrow">›</text>
        </view>

        <view class="info-row" @tap="openField('college')">
          <text class="info-label">院系</text>
          <text class="info-value ellipsis">{{ me.college || '未填写' }}</text>
          <text class="info-arrow">›</text>
        </view>

        <view class="info-row" @tap="openSkills">
          <text class="info-label">技能标签</text>
          <text class="info-value ellipsis">{{ skillsText }}</text>
          <text class="info-arrow">›</text>
        </view>

        <view class="info-row" @tap="openField('bio')">
          <text class="info-label">个人简介</text>
          <text class="info-value ellipsis">{{ me.bio || '未填写' }}</text>
          <text class="info-arrow">›</text>
        </view>

        <view v-if="!adminMode" class="info-row" @tap="onSidRow">
          <text class="info-label">学号</text>
          <text class="info-value ellipsis">{{ me.studentId || '未填写' }}</text>
          <text class="info-arrow">›</text>
        </view>
      </view>

      <!-- 功能入口 -->
      <view class="menu">
        <view v-if="adminMode" class="menu-item" @tap="goAdmin">
          <text class="menu-emoji">🛡️</text>
          <text class="menu-label">管理后台</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goOrders">
          <text class="menu-emoji">📋</text>
          <text class="menu-label">我的订单</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goWallet">
          <text class="menu-emoji">👛</text>
          <text class="menu-label">我的钱包</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goProfile">
          <text class="menu-emoji">👤</text>
          <text class="menu-label">我的主页</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goRules">
          <text class="menu-emoji">📖</text>
          <text class="menu-label">平台规则与帮助</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="doLogout">
          <text class="menu-emoji">🚪</text>
          <text class="menu-label">退出登录</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="doReset">
          <text class="menu-emoji">♻️</text>
          <text class="menu-label">重置演示数据</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 补填学号 -->
    <view v-if="sheet === 'fill'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">补填学号</text>
        <text class="sheet-hint">学号唯一，需要通过注册手机号验证</text>
        <text class="label">学号</text>
        <input v-model="fillForm.studentId" class="input" type="number" maxlength="12" placeholder="8-12 位学号" placeholder-class="ph" />
        <text class="label mt-24">手机号</text>
        <input v-model="fillForm.phone" class="input" type="number" maxlength="11" placeholder="注册时填写的手机号" placeholder-class="ph" />
        <text class="label mt-24">验证码</text>
        <view class="row">
          <input v-model="fillForm.code" class="input flex1" type="number" maxlength="6" placeholder="演示码 123456" placeholder-class="ph" />
          <view class="mini-btn mini-soft code-btn" @tap="sendFillCode">
            <text class="mini-btn-text blue">获取验证码</text>
          </view>
        </view>
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-text-dark">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="saveFill">
            <text class="btn-text-white">确认绑定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 缴纳押金 -->
    <view v-if="sheet === 'recharge'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">缴纳押金</text>
        <text class="sheet-hint">演示环境直接记账，不对接真实支付</text>
        <text class="label">缴纳金额（元）</text>
        <input v-model="rechargeAmount" class="input" type="digit" placeholder="50" placeholder-class="ph" />
        <view class="quick-row">
          <text v-for="q in quickDeposit" :key="q" class="quick-chip" @tap="rechargeAmount = String(q)">{{ q }}</text>
        </view>
        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-text-dark">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="doRecharge">
            <text class="btn-text-white">确认缴纳</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 单项编辑：点哪项改哪项 -->
    <view v-if="field" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">{{ fieldTitle }}</text>

        <!-- 技能标签 -->
        <template v-if="field === 'skills'">
          <view class="row between">
            <text class="t-tiny">已选</text>
            <text class="tag-count">{{ edit.tags.length }}/{{ tagMaxCount }}</text>
          </view>
          <view v-if="edit.tags.length" class="tag-wrap">
            <view v-for="(t, i) in edit.tags" :key="'picked' + i" class="tag tag-on" @tap="removeTag(i)">
              <text class="tag-text tag-text-on">{{ t }}</text>
              <text class="tag-x">✕</text>
            </view>
          </view>
          <text v-else class="hint">还没选，下面点几个，或自己加一个</text>

          <text class="label mt-24">常用标签</text>
          <view class="tag-wrap">
            <view
              v-for="t in tagOptions"
              :key="t"
              class="tag"
              :class="{ 'tag-picked': edit.tags.indexOf(t) >= 0 }"
              @tap="toggleTag(t)"
            >
              <text class="tag-text" :class="{ 'tag-text-picked': edit.tags.indexOf(t) >= 0 }">{{ t }}</text>
            </view>
          </view>

          <view class="tag-custom">
            <input
              v-model="tagInput"
              class="input flex1"
              :maxlength="tagMaxLen"
              placeholder="自定义，最多 4 个字"
              placeholder-class="ph"
              confirm-type="done"
              @confirm="addTag"
            />
            <view class="tag-add" @tap="addTag">
              <text class="tag-add-text">添加</text>
            </view>
          </view>
        </template>

        <!-- 文本类字段 -->
        <template v-else>
          <textarea
            v-if="field === 'bio'"
            v-model="fieldValue"
            class="textarea"
            maxlength="80"
            placeholder="一句话介绍自己"
            placeholder-class="ph"
          />
          <input
            v-else
            v-model="fieldValue"
            class="input"
            :maxlength="fieldMax"
            :placeholder="fieldPlaceholder"
            placeholder-class="ph"
          />
        </template>

        <view class="row mt-32">
          <view class="btn btn-ghost flex1 mr-16" @tap="closeSheet">
            <text class="btn-text-dark">取消</text>
          </view>
          <view class="btn btn-primary flex1" @tap="saveField">
            <text class="btn-text-white">保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 点击头像放大查看 -->
    <AvatarViewer
      :visible="showViewer"
      :src="me.avatar"
      :name="me.nickname || me.name"
      @close="showViewer = false"
    />

    <!-- 系统自带头像：emoji 选择 -->
    <view v-if="sheet === 'emoji'" class="mask" @tap="closeSheet">
      <view class="sheet pop" @tap.stop>
        <text class="sheet-title">系统自带头像</text>
        <text class="sheet-hint">点一个直接用，随时可以再换</text>
        <view class="avatars">
          <view
            v-for="(e, i) in avatarOptions"
            :key="i"
            class="avatar-opt"
            :class="{ 'avatar-opt-on': me.avatar === e }"
            @tap="pickEmoji(e)"
          >
            <text class="avatar-opt-emoji">{{ e }}</text>
          </view>
        </view>
        <view class="row mt-32">
          <view class="btn btn-ghost flex1" @tap="closeSheet">
            <text class="btn-text-dark">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 头像裁剪：选完图先在这里调整范围 -->
    <AvatarCropper
      :visible="showCrop"
      :src="cropSrc"
      @cancel="onCropCancel"
      @confirm="onCropConfirm"
    />

    <SideNav v-if="isDesktop" active="mine" :unread="unread" />
    <TabBar v-else active="mine" :unread="unread" />
  </view>
</template>

<script>
import TabBar from '../../components/TabBar.vue'
import SideNav from '../../components/SideNav.vue'
import Avatar from '../../components/Avatar.vue'
import AvatarCropper from '../../components/AvatarCropper.vue'
import AvatarViewer from '../../components/AvatarViewer.vue'
import TaskCard from '../../components/TaskCard.vue'
import EmptyState from '../../components/EmptyState.vue'
import { creditLevel, SKILL_TAGS, SKILL_TAG_MAX_LEN, SKILL_TAG_MAX_COUNT } from '../../utils/constants.js'
import { pickImage as pickImageFile, pickFiles, compressImage, toAvatarDataUrl } from '../../utils/file.js'
import {
  currentUser,
  guardLogin,
  isAdmin as isAdminUser,
  myStats,
  listTasks,
  toggleAccepting,
  updateProfile,
  logout,
  resetAll,
  unreadCount,
  depositOf,
  rechargeDeposit,
  fillStudentId,
  needStudentId,
  setAvatarImage,
  avatarHistory,
  useAvatarFromHistory,
  isVerified,
  setAvatarEmoji,
  currentTitleOf,
  dataTick,
  viewedTaskIds
} from '../../utils/store.js'
import { isDesktopNow } from '../../utils/device.js'
import tapGuard from '../../utils/tapguard.js'

export default {
  components: { TabBar, SideNav, TaskCard, EmptyState, Avatar, AvatarCropper, AvatarViewer },
  mixins: [tapGuard],
  data() {
    return {
      statusBarHeight: 0,
      isDesktop: false,
      unread: 0,
      viewedTick: 0,
      sheet: '',
      fillForm: { studentId: '', phone: '', code: '' },
      rechargeAmount: '',
      quickDeposit: [50, 100, 200],
      avatarOptions: ['🐰', '🐻', '🐱', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐧', '🦉', '🐙', '🌻', '🍀', '⭐', '🎧', '📚', '🎨', '⚽', '🎸'],
      cropSrc: '',
      showCrop: false,
      showViewer: false,
      showHistory: false,
      history: [],
      field: '',
      fieldValue: '',
      edit: { tags: [] },
      tagOptions: SKILL_TAGS,
      tagMaxLen: SKILL_TAG_MAX_LEN,
      tagMaxCount: SKILL_TAG_MAX_COUNT,
      tagInput: ''
    }
  },
  computed: {
    verified() {
      return isVerified(this.me)
    },
    historyCount() {
      return avatarHistory().length
    },
    viewedCount() {
      this.viewedTick
      return viewedTaskIds(this.me.id).length
    },
    title() {
      return currentTitleOf(this.me)
    },
    me() {
      // 依赖 dataTick，并返回浅拷贝：否则改头像时对象引用没变，Vue 不会重渲染
      dataTick.value
      const u = currentUser()
      if (u) return { ...u }
      return {
        name: '',
        nickname: '',
        avatar: '🙂',
        credit: 0,
        studentId: '',
        skills: [],
        accepting: false,
        college: '',
        bio: ''
      }
    },
    adminMode() {
      return isAdminUser()
    },
    skillsText() {
      const list = this.me.skills || []
      return list.length ? list.join(' · ') : '未填写'
    },
    fieldTitle() {
      return { nickname: '改昵称', college: '改院系', bio: '改个人简介', skills: '技能标签' }[this.field] || ''
    },
    fieldMax() {
      return { nickname: 10, college: 20 }[this.field] || 20
    },
    fieldPlaceholder() {
      return {
        nickname: '别人看到的名字',
        college: '例：计算机科学 · 大三'
      }[this.field] || ''
    },
    level() {
      return creditLevel(this.me.credit)
    },
    deposit() {
      return depositOf(this.me)
    },
    stats() {
      return myStats()
    },
    published() {
      return listTasks({ publisherId: this.me.id, audit: 'all' })
    },
    taken() {
      return listTasks({ assigneeId: this.me.id, audit: 'all' })
    },
  },
  onLoad(options) {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
    } catch (e) {
      this.statusBarHeight = 0
    }
    this.isDesktop = isDesktopNow()
    if (!guardLogin()) return
    this.refresh()
    if (options && options.fill === '1') this.openFill()
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
      this.unread = unreadCount()
      // 从详情页返回时刷新浏览记录条数
      this.viewedTick++
    },
    onAccepting(e) {
      toggleAccepting()
      uni.showToast({ title: e.detail.value ? '已开启接单' : '已暂停接单', icon: 'none' })
    },
    closeSheet() {
      this.sheet = ''
      this.field = ''
    },
    openFill() {
      this.fillForm = { studentId: '', phone: this.me.phone || '', code: '' }
      this.sheet = 'fill'
    },
    sendFillCode() {
      if (!/^1\d{10}$/.test(this.fillForm.phone)) {
        uni.showToast({ title: '请输入 11 位手机号', icon: 'none' })
        return
      }
      uni.showToast({ title: '演示环境验证码固定为 123456', icon: 'none' })
    },
    saveFill() {
      const r = fillStudentId(this.fillForm)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.sheet = ''
      uni.showToast({ title: r.msg, icon: 'success' })
      this.refresh()
    },
    openRecharge() {
      if (!this.isTap()) return
      this.rechargeAmount = '50'
      this.sheet = 'recharge'
    },
    doRecharge() {
      const r = rechargeDeposit(this.rechargeAmount)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.sheet = ''
      uni.showToast({ title: r.msg, icon: 'none' })
      this.refresh()
    },
    toggleTag(t) {
      const i = this.edit.tags.indexOf(t)
      if (i >= 0) {
        this.edit.tags.splice(i, 1)
        return
      }
      if (this.edit.tags.length >= SKILL_TAG_MAX_COUNT) {
        uni.showToast({ title: `最多选 ${SKILL_TAG_MAX_COUNT} 个标签`, icon: 'none' })
        return
      }
      this.edit.tags.push(t)
    },
    removeTag(i) {
      this.edit.tags.splice(i, 1)
    },
    addTag() {
      const v = String(this.tagInput || '').trim()
      if (!v) {
        uni.showToast({ title: '先输入标签内容', icon: 'none' })
        return
      }
      if (v.length > SKILL_TAG_MAX_LEN) {
        uni.showToast({ title: `标签最多 ${SKILL_TAG_MAX_LEN} 个字`, icon: 'none' })
        return
      }
      if (this.edit.tags.indexOf(v) >= 0) {
        uni.showToast({ title: '这个标签已经有了', icon: 'none' })
        this.tagInput = ''
        return
      }
      if (this.edit.tags.length >= SKILL_TAG_MAX_COUNT) {
        uni.showToast({ title: `最多选 ${SKILL_TAG_MAX_COUNT} 个标签`, icon: 'none' })
        return
      }
      this.edit.tags.push(v)
      this.tagInput = ''
    },
    // 点头像：弹出「更改头像 / 历史头像」
    onAvatarTap() {
      if (!this.isTap()) return
      uni.showActionSheet({
        itemList: ['更改头像', '历史头像'],
        success: (res) => {
          if (res.tapIndex === 0) this.chooseAvatarSource()
          else if (res.tapIndex === 1) this.goAvatars()
        }
      })
    },
    // 更改头像：手机「从相册选择 / 系统自带头像」，电脑「本地选择 / 系统自带头像」
    chooseAvatarSource() {
      const items = this.isDesktop ? ['本地选择', '系统自带头像'] : ['从相册选择', '系统自带头像']
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          if (res.tapIndex === 0) {
            if (this.isDesktop) {
              const list = await pickFiles({ count: 1 })
              if (list && list.length) await this.startCrop(list[0].path)
            } else {
              const f = await pickImageFile()
              if (f) await this.startCrop(f.path)
            }
          } else if (res.tapIndex === 1) {
            this.sheet = 'emoji'
          }
        }
      })
    },
    pickEmoji(e) {
      const r = setAvatarEmoji(e)
      uni.showToast({ title: r.ok ? '头像已更新' : r.msg, icon: 'none' })
      if (r.ok) this.refresh()
      this.sheet = ''
    },
    openAvatarSheet() {
      const isImg = String(this.me.avatar || '').indexOf('data:image') === 0
      const items = ['从相册选择', '从文件选择', '换个 emoji 头像', isImg ? '恢复默认头像' : '重置为默认头像']
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          if (res.tapIndex === 0) {
            const f = await pickImageFile()
            if (f) await this.startCrop(f.path)
          } else if (res.tapIndex === 1) {
            const list = await pickFiles({ count: 1 })
            if (list && list.length) await this.startCrop(list[0].path)
          } else if (res.tapIndex === 2) {
            const pool = this.avatarOptions
            const r = setAvatarEmoji(pool[Math.floor(Math.random() * pool.length)])
            uni.showToast({ title: r.ok ? '换好了，再点可以继续换' : r.msg, icon: 'none' })
            if (r.ok) this.refresh()
          } else {
            const r = setAvatarEmoji('🙂')
            uni.showToast({ title: r.ok ? '已恢复默认头像' : r.msg, icon: 'none' })
            if (r.ok) this.refresh()
          }
        }
      })
    },
    // 选好图先打开裁剪框：默认铺满，用户可拖动缩放
    async startCrop(path) {
      if (!path) {
        uni.showToast({ title: '没有取到图片', icon: 'none' })
        return
      }
      uni.showLoading({ title: '读取中' })
      // 先缩到 1200px 再进裁剪框：原图动辄几 MB，裁剪时拖动会卡
      const raw = await compressImage(path, { max: 1200, quality: 0.92 })
      uni.hideLoading()
      if (!raw) {
        uni.showToast({ title: '读取图片失败，换一张试试', icon: 'none' })
        return
      }
      this.cropSrc = raw
      this.showCrop = true
    },
    goVerify() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/verify/verify' })
    },
    openAvatarViewer() {
      this.showViewer = true
    },
    goAvatars() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/avatars/avatars' })
    },
    goTitle() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/title/title' })
    },
    goViewed() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/history/history' })
    },
    openHistorySheet() {
      this.history = avatarHistory()
      this.showHistory = true
    },
    useHistory(url) {
      const r = useAvatarFromHistory(url)
      uni.showToast({ title: r.ok ? '已换上这张头像' : r.msg, icon: 'none' })
      if (r.ok) {
        this.showHistory = false
        this.history = avatarHistory()
        this.refresh()
      }
    },
    onCropCancel() {
      this.showCrop = false
      this.cropSrc = ''
    },
    onCropConfirm(dataUrl) {
      this.showCrop = false
      this.cropSrc = ''
      if (!dataUrl) {
        uni.showToast({ title: '裁剪失败，换一张试试', icon: 'none' })
        return
      }
      const r = setAvatarImage(dataUrl)
      uni.showToast({ title: r.ok ? '头像已更新' : r.msg, icon: 'none' })
      if (r.ok) this.refresh()
    },
    async applyAvatar(path) {
      if (!path) {
        uni.showToast({ title: '没有取到图片', icon: 'none' })
        return
      }
      uni.showLoading({ title: '处理中' })
      // 先压缩再存：手机原图 base64 动辄几百 KB，会超过上限导致「上传失败」
      const data = await toAvatarDataUrl(path)
      uni.hideLoading()
      if (!data) {
        uni.showToast({ title: '读取图片失败，换一张试试', icon: 'none' })
        return
      }
      const r = setAvatarImage(data)
      uni.showToast({ title: r.ok ? '头像已更新' : r.msg, icon: 'none' })
      if (r.ok) this.refresh()
    },
    openField(key) {
      if (!this.isTap()) return
      if (key === 'skills') {
        this.openSkills()
        return
      }
      this.sheet = ''
      this.field = key
      this.fieldValue = String(this.me[key] || '')
    },
    openSkills() {
      this.sheet = ''
      this.edit = { tags: (this.me.skills || []).slice(0, SKILL_TAG_MAX_COUNT) }
      this.tagInput = ''
      this.field = 'skills'
    },
    saveField() {
      if (this.field === 'skills') {
        const r = updateProfile({ skills: this.edit.tags.slice() })
        if (!r.ok) {
          uni.showToast({ title: r.msg, icon: 'none' })
          return
        }
        this.field = ''
        uni.showToast({ title: '已保存', icon: 'none' })
        this.refresh()
        return
      }
      const key = this.field
      const v = String(this.fieldValue || '').trim()
      if (key === 'nickname' && !v) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }
      const patch = {}
      patch[key] = v
      const r = updateProfile(patch)
      if (!r.ok) {
        uni.showToast({ title: r.msg, icon: 'none' })
        return
      }
      this.field = ''
      uni.showToast({ title: '已保存', icon: 'none' })
      this.refresh()
    },
    onSidRow() {
      if (this.me.studentId) {
        uni.showToast({ title: '学号已绑定：' + this.me.studentId, icon: 'none' })
        return
      }
      this.openFill()
    },
    goPublish() {
      uni.navigateTo({ url: '/pages/publish/publish' })
    },
    goHall() {
      uni.reLaunch({ url: '/pages/hall/hall' })
    },
    goAdmin() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/admin/admin' })
    },
    goOrders() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/orders/orders' })
    },
    goWallet() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/wallet/wallet' })
    },
    goProfile() {
      if (!this.isTap()) return
      if (!this.me.id) return
      uni.navigateTo({ url: '/pages/profile/profile?id=' + this.me.id })
    },
    goRules() {
      if (!this.isTap()) return
      uni.navigateTo({ url: '/pages/rules/rules' })
    },
    doLogout() {
      if (!this.isTap()) return
      uni.showModal({
        title: '退出登录',
        content: '退出后需要重新登录才能使用。',
        confirmText: '退出',
        confirmColor: '#F04A4A',
        success: (res) => {
          if (!res.confirm) return
          logout()
          uni.reLaunch({ url: '/pages/login/login' })
        }
      })
    },
    doReset() {
      if (!this.isTap()) return
      uni.showModal({
        title: '重置演示数据',
        content: '会清空所有委托、消息、评价，恢复成初始演示数据。',
        confirmText: '确认重置',
        confirmColor: '#F04A4A',
        success: (res) => {
          if (!res.confirm) return
          resetAll()
          uni.showToast({ title: '已重置', icon: 'success' })
          setTimeout(() => uni.reLaunch({ url: '/pages/hall/hall' }), 500)
        }
      })
    }
  }
}
</script>

<style scoped>
.hero {
  background-color: #4c6fff;
  padding: 0 32rpx 32rpx;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
}
.hero-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 24rpx;
}
.hero-page-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}
.hero-edit {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(255, 255, 255, 0.18);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
}
.profile {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.p-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 54rpx;
  margin-right: 20rpx;
}
.p-name {
  font-size: 34rpx;
  font-weight: 800;
  color: #ffffff;
  margin-right: 10rpx;
}
.p-level {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.p-level-text {
  font-size: 19rpx;
  color: #ffffff;
  font-weight: 600;
}
.p-title {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
}
.p-title-text {
  font-size: 19rpx;
  font-weight: 700;
}
.p-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
  margin-top: 8rpx;
}
.p-credit {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.p-credit-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
}
.p-credit-label {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4rpx;
}
.stats {
  display: flex;
  flex-direction: row;
  margin-top: 30rpx;
  background-color: rgba(255, 255, 255, 0.14);
  border-radius: 24rpx;
  padding: 22rpx 0;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
}
.stat-label {
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 6rpx;
}
.body {
  padding: 24rpx 32rpx 200rpx;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid rgba(226, 232, 240, 0.8);
  /* 立体上浮：大范围柔和投影 + 近处紧致投影，卡片像独立浮在屏幕之上 */
  box-shadow: 0 16rpx 36rpx -12rpx rgba(15, 23, 42, 0.14), 0 4rpx 12rpx rgba(15, 23, 42, 0.05);
}
.switch-card {
  padding: 26rpx 28rpx;
}
.switch-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
}
.switch-sub {
  font-size: 21rpx;
  color: #8b90a3;
  margin-top: 6rpx;
  line-height: 1.45;
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 16rpx;
}
.mb-0 {
  margin-bottom: 0;
}
/* 头像：整块可点，右下角相机角标 */
.avatar-hit {
  position: relative;
  width: 112rpx;
  height: 112rpx;
  margin-right: 20rpx;
}
.avatar-cam {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
}
.avatar-cam-text {
  font-size: 21rpx;
}

/* 资料行 */
.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 92rpx;
  border-bottom: 2rpx solid #f3f4f9;
}
.info-row:last-child {
  border-bottom-width: 0;
}
.info-label {
  width: 150rpx;
  font-size: 26rpx;
  color: #4a4f63;
  font-weight: 600;
}
.info-value {
  flex: 1;
  font-size: 25rpx;
  color: #8b90a3;
  text-align: right;
  margin-right: 10rpx;
}
.info-arrow {
  font-size: 30rpx;
  color: #c3c7d4;
  margin-left: 6rpx;
}
.tag-count {
  font-size: 21rpx;
  color: #b6bac9;
}
.tag-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 14rpx;
}
.tag {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 56rpx;
  padding: 0 20rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
  border-radius: 999rpx;
  border: 2rpx solid #edeff6;
  background-color: #f7f8fc;
  flex-shrink: 0;
}
.tag-picked {
  border-color: #c9d5ff;
  background-color: #f0f3ff;
}
.tag-on {
  border-color: #4c6fff;
  background-color: #4c6fff;
}
.tag-text {
  font-size: 23rpx;
  color: #6b7080;
  font-weight: 600;
}
.tag-text-picked {
  color: #4c6fff;
}
.tag-text-on {
  color: #ffffff;
}
.tag-x {
  font-size: 19rpx;
  color: #ffffff;
  margin-left: 8rpx;
  opacity: 0.85;
}
.tag-custom {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 16rpx;
}
.tag-add {
  height: 72rpx;
  padding: 0 28rpx;
  margin-left: 14rpx;
  border-radius: 16rpx;
  background-color: #eef1ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-add-text {
  font-size: 25rpx;
  font-weight: 700;
  color: #4c6fff;
}
.skills {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 18rpx;
}
.skill {
  font-size: 22rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
}
.empty-tip {
  display: block;
  font-size: 22rpx;
  color: #b6bac9;
  margin-top: 14rpx;
}
.bio {
  display: block;
  font-size: 25rpx;
  color: #4a4f63;
  line-height: 1.6;
}
.tabs {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 20rpx;
}
.tab {
  font-size: 24rpx;
  color: #8b90a3;
  font-weight: 600;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  margin-right: 10rpx;
  margin-bottom: 10rpx;
  background-color: #ffffff;
}
.tab-on {
  background-color: #4c6fff;
  color: #ffffff;
}
.tab-count {
  font-size: 18rpx;
  margin-left: 4rpx;
  opacity: 0.85;
}
.review-card {
  margin-bottom: 16rpx;
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
.work-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #14161f;
}
.work-desc {
  display: block;
  font-size: 23rpx;
  color: #8b90a3;
  line-height: 1.55;
  margin-top: 8rpx;
}
.work-link {
  margin-top: 14rpx;
  background-color: #f7f8fc;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
}
.work-link-text {
  font-size: 21rpx;
  color: #4c6fff;
}
.add-work {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #d8dcea;
  box-shadow: none;
  background-color: transparent;
}
.add-work-text {
  font-size: 24rpx;
  color: #8b90a3;
}
.reply {
  margin-top: 14rpx;
  background-color: #e6faf6;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}
.reply-text {
  font-size: 22rpx;
  color: #17977f;
  line-height: 1.5;
}
.menu {
  background-color: #ffffff;
  border-radius: 28rpx;
  overflow: hidden;
  margin-top: 8rpx;
  box-shadow: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
.menu-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx;
  border-bottom: 2rpx solid #f2f4fa;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-emoji {
  font-size: 30rpx;
  margin-right: 18rpx;
}
.menu-label {
  flex: 1;
  font-size: 26rpx;
  color: #14161f;
  font-weight: 600;
}
.menu-arrow {
  font-size: 30rpx;
  color: #c3c7d4;
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
  height: 150rpx;
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
.btn-text-dark {
  font-size: 26rpx;
  font-weight: 600;
  color: #4a4f63;
}
.btn-text-white {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
.avatar-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 18rpx;
}
.avatar-upload {
  flex: 1;
  margin-left: 20rpx;
  height: 96rpx;
  border: 2rpx dashed #d8dcea;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.avatar-upload-text {
  font-size: 24rpx;
  color: #4c6fff;
  font-weight: 600;
}
.avatar-upload-hint {
  font-size: 19rpx;
  color: #b6bac9;
  margin-top: 4rpx;
}
.avatars {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.avatar-opt {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background-color: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
  border: 4rpx solid transparent;
  box-sizing: border-box;
}
.avatar-opt-on {
  border-color: #4c6fff;
  background-color: #eef1ff;
}
.avatar-opt-emoji {
  font-size: 38rpx;
}
.warn-card {
  background-color: #fff8ee;
  box-shadow: none;
}
.warn-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #a8621f;
}
.warn-sub {
  font-size: 21rpx;
  color: #c08a52;
  margin-top: 6rpx;
  line-height: 1.45;
}
.mini-btn {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.mini-accent {
  background-color: #ff8a3d;
}
.mini-soft {
  background-color: #eef1ff;
}
.mini-btn-text {
  font-size: 22rpx;
  font-weight: 700;
}
.mini-btn-text.white {
  color: #ffffff;
}
.mini-btn-text.blue {
  color: #4c6fff;
}
.dep-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #4c6fff;
  letter-spacing: -1rpx;
}
.dep-label {
  font-size: 20rpx;
  color: #8b90a3;
  margin-left: 10rpx;
}
.dep-tip {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 14rpx;
  line-height: 1.5;
}
.quick-row {
  display: flex;
  flex-direction: row;
  margin-top: 14rpx;
}
.quick-chip {
  font-size: 23rpx;
  color: #4c6fff;
  background-color: #eef1ff;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  margin-right: 12rpx;
  font-weight: 600;
}
.code-btn {
  margin-left: 16rpx;
}

.ok-text {
  color: #17977f;
  font-weight: 700;
}

/* 历史头像面板 */
.hist-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1300;
  background-color: rgba(20, 22, 31, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  box-sizing: border-box;
}
.hist-panel {
  width: 100%;
  max-width: 340px;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 22px 20px 16px;
  box-sizing: border-box;
}
.hist-title {
  display: block;
  font-size: 17px;
  font-weight: 800;
  color: #14161F;
  text-align: center;
}
.hist-sub {
  display: block;
  font-size: 11.5px;
  color: #8B90A3;
  text-align: center;
  margin-top: 6px;
  margin-bottom: 14px;
  line-height: 1.6;
}
.hist-scroll {
  max-height: 240px;
}
.hist-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.hist-item {
  width: 33.33%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.hist-empty {
  padding: 18px 6px 10px;
}
.hist-empty-text {
  display: block;
  font-size: 12.5px;
  color: #8B90A3;
  text-align: center;
  line-height: 1.7;
}
.hist-close {
  margin-top: 12px;
  height: 42px;
  border-radius: 12px;
  background-color: #F1F3FA;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hist-close-text {
  font-size: 14px;
  font-weight: 700;
  color: #6B7080;
}

/* ============================================================
   统一按钮按下反馈：缩小 + 背景变暗
   · :active 在按下（含长按按住）期间持续生效，松开即回弹
   · brightness 让白底按钮变灰、蓝底按钮变深蓝，通用不挑背景色
   ============================================================ */
.avatar-cam,
.info-row,
.menu-item,
.tab,
.quick-chip,
.tag,
.tag-add,
.hist-item,
.hist-close,
.add-work,
.mini-btn,
.btn {
  transition: transform 120ms cubic-bezier(0, 0, 0.58, 1),
    filter 120ms cubic-bezier(0, 0, 0.58, 1);
}
.avatar-cam:active,
.info-row:active,
.menu-item:active,
.tab:active,
.quick-chip:active,
.tag:active,
.tag-add:active,
.hist-item:active,
.hist-close:active,
.add-work:active,
.mini-btn:active,
.btn:active {
  transform: translateY(2rpx) scale(0.985);
  filter: brightness(0.96);
  opacity: 1;
}
</style>
