<template>
  <view class="cc-page" :class="{ 'has-side': isDesktop }">
    <SideNav v-if="isDesktop" active="publish" />
    <AppHeader title="发布订单" :back="false" />

    <view class="body">
      <view v-if="aiSeeded" class="ai-seed">
        <text class="ai-seed-text">已根据你的一句话预填标题和描述，补全类型与截止时间即可发布</text>
      </view>

      <!-- ① 标题：放在第一位，最显眼 -->
      <view class="card card-title">
        <view class="row between">
          <text class="label mb-0">① 委托标题<text class="req">*</text></text>
          <text class="tpl-hint">{{ form.title.length }}/30</text>
        </view>
        <input
          class="input-title"
          v-model="form.title"
          placeholder="一句话说清要做什么，例：帮买一杯奶茶送到松园 3 号楼"
          placeholder-class="ph"
          maxlength="30"
        />
        <text v-if="bannedHint" class="banned-tip">⚠️ 内容包含违规词「{{ bannedHint }}」，发布会失败，请先修改</text>
      </view>

      <!-- 第一步：订单类型 -->
      <view class="card">
        <view class="row between">
          <text class="label mb-0">② 选择类型<text class="req">*</text></text>
          <text class="tpl-hint">不同类型要求不同</text>
        </view>
        <view class="cats">
          <view
            v-for="c in categories"
            :key="c.key"
            class="cat"
            :class="{ 'cat-on': form.category === c.key }"
            :style="form.category === c.key ? { backgroundColor: c.color, borderColor: c.color } : {}"
            @tap="pickCategory(c.key)"
          >
            <text class="cat-emoji">{{ c.emoji }}</text>
            <text class="cat-name">{{ c.name }}</text>
          </view>
        </view>
        <view v-if="activeCat" class="cat-tip">
          <text class="cat-tip-text">{{ catTip }}</text>
        </view>
      </view>

      <!-- 常用模板 -->
      <view class="card">
        <view class="row between">
          <text class="label mb-0">常用模板</text>
          <text class="tpl-hint">点一下自动填好，可再改</text>
        </view>
        <scroll-view class="tpl-scroll" scroll-x :show-scrollbar="false">
          <view class="tpl-inner">
            <view v-for="t in templates" :key="t.key" class="tpl" @tap="applyTemplate(t)">
              <text class="tpl-emoji">{{ t.emoji }}</text>
              <text class="tpl-name">{{ t.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 描述 -->
      <view class="card">
        <text class="label">③ 补充描述<text class="req">*</text></text>
        <textarea
          class="textarea"
          v-model="form.desc"
          placeholder="具体做什么、有什么要求、怎么交付……写清楚更容易被接"
          placeholder-class="ph"
          maxlength="200"
        />
        <text class="counter">{{ form.desc.length }}/200</text>
      </view>

      <!-- 代取类：商品价格 + 凭证 -->
      <view v-if="needItemPrice" class="card">
        <view class="row between">
          <text class="label mb-0">商品价格<text class="req">*</text></text>
          <text class="tpl-hint">上限 ¥{{ itemMax }}</text>
        </view>
        <view class="money">
          <text class="money-sign">¥</text>
          <input class="money-input" v-model="form.itemPrice" type="digit" placeholder="0" placeholder-class="ph" />
        </view>
        <text class="hint">这是商品本身的钱（奶茶、快递费等），不含给你的跑腿费</text>

        <view class="row between mt-24">
          <text class="label mb-0">凭证<text class="req">*</text></text>
          <text class="tpl-hint">订单截图 / 小票，证明商品价格</text>
        </view>
        <view v-for="(p, i) in form.proof" :key="i" class="att">
          <text class="att-icon">🧾</text>
          <text class="att-name ellipsis">{{ p.name }}</text>
          <text class="att-size">{{ p.size }}</text>
          <text class="att-del" @tap="removeProof(i)">✕</text>
        </view>
        <view class="att-add" @tap="pickProof">
          <text class="att-add-text">＋ 上传凭证</text>
        </view>
      </view>

      <!-- 报酬 -->
      <view class="card">
        <view class="row between">
          <text class="label mb-0">④ 订单报酬<text class="req">*</text></text>
          <text class="tpl-hint">上限 ¥{{ budgetMax }}</text>
        </view>
        <view class="money">
          <text class="money-sign">¥</text>
          <input class="money-input" v-model="form.budget" type="digit" placeholder="0" placeholder-class="ph" />
          <view class="money-quick">
            <text
              v-for="q in quickAmounts"
              :key="q"
              class="quick"
              :class="{ 'quick-on': String(form.budget) === String(q) }"
              @tap="form.budget = String(q)"
            >
              {{ q }}
            </text>
          </view>
        </view>
        <view class="deposit-tip">
          <text class="deposit-tip-text">
            💰 接单人需缴纳 {{ depositPreview }} 元押金（不低于 {{ depositMin }} 元且不低于订单报酬），验收通过后全额返还
          </text>
        </view>
      </view>

      <!-- 地点与时间 -->
      <view class="card">
        <text class="label">⑤ 交付地点<text class="req">*</text></text>
        <input
          class="input"
          v-model="form.place"
          placeholder="例：1-6号学生公寓楼下 / 教学楼 / 两江餐厅"
          placeholder-class="ph"
          maxlength="30"
        />

        <text class="label mt-24">所在楼栋</text>
        <scroll-view class="bd-scroll" scroll-x :show-scrollbar="false">
          <view class="bd-inner">
            <view
              v-for="b in buildings"
              :key="b.key"
              class="bd"
              :class="{ 'bd-on': form.building === b.key }"
              @tap="form.building = b.key"
            >
              <text class="bd-text" :class="{ 'bd-text-on': form.building === b.key }">{{ b.short }}</text>
            </view>
          </view>
        </scroll-view>

        <text class="label mt-24">截止时间<text class="req">*</text></text>
        <view class="time-row">
          <picker mode="date" :value="dateValue" :start="todayStr" @change="onDateChange">
            <view class="picker">{{ dateValue || '选择日期' }}</view>
          </picker>
          <picker mode="time" :value="timeValue" @change="onTimeChange">
            <view class="picker">{{ timeValue || '选择时间' }}</view>
          </picker>
        </view>
        <text v-if="deadlineTip" class="deadline-tip">{{ deadlineTip }}</text>
      </view>

      <!-- 更多设置：默认收起，减少干扰 -->
      <view class="card">
        <view class="row between" @tap="showMore = !showMore">
          <text class="label mb-0">更多设置（选填）</text>
          <text class="more-toggle">{{ showMore ? '收起 ▲' : '加急 / 匿名 / 附件 ▼' }}</text>
        </view>

        <view v-if="showMore" class="more-body">
          <view class="row between mt-24">
            <view class="col">
              <text class="label mb-4">标记为加急</text>
              <text class="t-tiny">加急订单会在列表中优先展示</text>
            </view>
            <switch :checked="form.urgent" color="#FF8A3D" @change="onUrgent" />
          </view>

          <view class="row between mt-24">
            <view class="col">
              <text class="label mb-4">匿名发布</text>
              <text class="t-tiny">大厅里不显示你的昵称和信誉分</text>
            </view>
            <switch :checked="form.anonymous" color="#7C5CFF" @change="onAnonymous" />
          </view>

          <view class="row between mt-24">
            <text class="label mb-0">附件</text>
            <text class="tpl-hint">参考文件、素材、初稿</text>
          </view>
          <view v-for="(a, i) in form.attachments" :key="i" class="att">
            <text class="att-icon">📎</text>
            <text class="att-name ellipsis">{{ a.name }}</text>
            <text class="att-size">{{ a.size }}</text>
            <text class="att-del" @tap="removeAtt(i)">✕</text>
          </view>
          <view class="att-add" @tap="pickFile">
            <text class="att-add-text">＋ 添加附件</text>
          </view>
        </view>
      </view>

      <view class="rule-tip" @tap="goRules">
        <text class="rule-tip-text">⚠️ 禁止发布代考、代写论文、代刷课等违规委托，含违规词将被直接拦截</text>
      </view>

      <!-- 发布按钮随内容一起滚动（不再固定置底） -->
      <view class="submit-inline">
        <view class="btn btn-primary btn-block" :class="{ 'btn-disabled': !canSubmit }" @tap="submit">
          发布订单
        </view>
      </view>
    </view>

    <TabBar v-if="!isDesktop" active="publish" />
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import SideNav from '../../components/SideNav.vue'
import TabBar from '../../components/TabBar.vue'
import {
  BUILDINGS,
  BUDGET_MAX,
  ITEM_PRICE_MAX,
  DEPOSIT_MIN,
  requiredDeposit
} from '../../utils/constants.js'
import { pickFiles, formatSize } from '../../utils/file.js'
import {
  listCategories,
  categoryOf,
  createTask,
  currentUser,
  guardLogin,
  checkBanned,
  needStudentId
} from '../../utils/store.js'
import { isDesktopNow } from '../../utils/device.js'

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

const TEMPLATES = [
  {
    key: 'drink',
    emoji: '🧋',
    name: '代买奶茶',
    category: 'errand',
    title: '帮买一杯奶茶送到宿舍楼下',
    desc: '一食堂二楼那家，四季春玛奇朵，少冰三分糖，送到楼下就行。',
    place: '第一学生食堂',
    building: 'canteen1',
    budget: 8,
    itemPrice: 18
  },
  {
    key: 'parcel',
    emoji: '📦',
    name: '代取快递',
    category: 'errand',
    title: '帮取两个快递，驿站到宿舍楼',
    desc: '两个中等大小的箱子，不重。取件码私聊发你，送到宿舍楼下就行，我下来接。',
    place: '1号门（学校进出口）',
    building: 'gate1',
    budget: 8,
    itemPrice: 1
  },
  {
    key: 'ppt',
    emoji: '📄',
    name: 'PPT 美化',
    category: 'doc',
    title: '课程结课 PPT 美化，20 页左右',
    desc: '内容已经做好了，只是排版比较丑。需要统一配色、加图示，做成能直接讲的版本。',
    place: '教学楼',
    building: 'teach',
    budget: 60
  },
  {
    key: 'tutor',
    emoji: '📚',
    name: '求辅导',
    category: 'study',
    title: '高数期末复习求辅导两小时',
    desc: '高数期末快到了，想找人帮梳理一遍重点题型，最好能带着做两套真题，图书馆或自习室都行。',
    place: '教学楼',
    building: 'teach',
    budget: 80
  },
  {
    key: 'photo',
    emoji: '📷',
    name: '求拍照',
    category: 'photo',
    title: '毕业照跟拍，校园内半天',
    desc: '想拍一组生活化的毕业照，不用太正式，主要要会抓拍。相机我可以借到。',
    place: '玫瑰花苑',
    building: 'rose',
    budget: 150
  }
]

export default {
  components: { AppHeader, SideNav, TabBar },
  data() {
    const now = new Date()
    const later = new Date(now.getTime() + 3 * 3600 * 1000)
    return {
      isDesktop: false,
      aiSeeded: false,
      showMore: false,
      categories: [],
      buildings: BUILDINGS,
      templates: TEMPLATES,
      budgetMax: BUDGET_MAX,
      itemMax: ITEM_PRICE_MAX,
      depositMin: DEPOSIT_MIN,
      quickAmounts: [5, 10, 20, 50, 100],
      form: {
        title: '',
        category: '',
        desc: '',
        budget: '',
        itemPrice: '',
        proof: [],
        place: '',
        building: 'apt16',
        urgent: false,
        anonymous: false,
        attachments: []
      },
      dateValue: `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`,
      timeValue: `${pad(later.getHours())}:${pad(later.getMinutes())}`,
      todayStr: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    }
  },
  computed: {
    activeCat() {
      return this.form.category ? categoryOf(this.form.category) : null
    },
    bannedHint() {
      // 实时提示：标题或描述里出现违规词就提前警告（最终由系统在提交时拦截）
      return checkBanned(`${this.form.title} ${this.form.desc}`)
    },
    needItemPrice() {
      return !!(this.activeCat && this.activeCat.needItemPrice)
    },
    catTip() {
      if (!this.activeCat) return ''
      return this.needItemPrice
        ? '代取代买类：需填写商品价格（≤200 元）并上传凭证，证明这笔钱是买东西花的'
        : '该类订单不需要填写商品价格，只填订单报酬即可'
    },
    depositPreview() {
      return requiredDeposit(this.form.budget || 0)
    },
    deadlineTs() {
      if (!this.dateValue || !this.timeValue) return 0
      const d = new Date(this.dateValue.replace(/-/g, '/') + ' ' + this.timeValue + ':00')
      const ts = d.getTime()
      return isNaN(ts) ? 0 : ts
    },
    deadlineTip() {
      if (!this.deadlineTs) return ''
      if (this.deadlineTs < Date.now()) return '截止时间已经过去了，换一个吧'
      return ''
    },
    canSubmit() {
      const f = this.form
      const base =
        !!f.category &&
        f.title.trim().length >= 4 &&
        f.desc.trim().length >= 10 &&
        f.place.trim().length >= 2 &&
        this.deadlineTs > Date.now() &&
        Number(f.budget) > 0 &&
        Number(f.budget) <= BUDGET_MAX
      if (!base) return false
      if (this.needItemPrice) {
        return Number(f.itemPrice) > 0 && Number(f.itemPrice) <= ITEM_PRICE_MAX && f.proof.length > 0
      }
      return true
    }
  },
  onLoad(options) {
    this.isDesktop = isDesktopNow()
    if (!guardLogin()) return
    this.categories = listCategories()

    // 从大厅 AI 输入框 / 意图胶囊带过来的一句话，直接预填
    const raw = options && options.text ? options.text : ''
    let seed = ''
    try {
      seed = decodeURIComponent(String(raw || '')).trim()
    } catch (e) {
      seed = String(raw || '').trim()
    }
    if (seed) {
      this.form.title = seed.slice(0, 30)
      this.form.desc =
        seed.length >= 10 ? seed : seed + '（补充具体要求、交付方式和时间）'
      this.aiSeeded = true
    }
  },
  methods: {
    pickCategory(key) {
      this.form.category = key
      const c = categoryOf(key)
      if (!c.needItemPrice) {
        this.form.itemPrice = ''
        this.form.proof = []
      }
    },
    applyTemplate(t) {
      this.form.title = t.title
      this.form.category = t.category
      this.form.desc = t.desc
      this.form.place = t.place
      this.form.building = t.building || this.form.building
      this.form.budget = String(t.budget)
      this.form.itemPrice = t.itemPrice ? String(t.itemPrice) : ''
      this.form.proof = []
      uni.showToast({
        title: t.itemPrice ? `已填入模板，记得上传凭证` : `已填入「${t.name}」模板`,
        icon: 'none'
      })
    },
    onDateChange(e) {
      this.dateValue = e.detail.value
    },
    onTimeChange(e) {
      this.timeValue = e.detail.value
    },
    onUrgent(e) {
      this.form.urgent = e.detail.value
    },
    onAnonymous(e) {
      this.form.anonymous = e.detail.value
    },
    async pickProof() {
      const files = await pickFiles({ count: 3 })
      if (!files.length) return
      files.forEach((f) => {
        this.form.proof.push({ name: f.name, size: formatSize(f.size) })
      })
    },
    removeProof(i) {
      this.form.proof.splice(i, 1)
    },
    async pickFile() {
      const files = await pickFiles({ count: 3 })
      if (!files.length) return
      files.forEach((f) => {
        this.form.attachments.push({
          name: f.name,
          size: formatSize(f.size),
          type: f.isImage ? 'image' : 'file'
        })
      })
    },
    removeAtt(i) {
      this.form.attachments.splice(i, 1)
    },
    goRules() {
      uni.navigateTo({ url: '/pages/rules/rules' })
    },
    submit() {
      const me = currentUser()
      if (needStudentId(me)) {
        uni.showModal({
          title: '请先完成学生认证',
          content: '未完成学生认证只能浏览，认证通过后才能发布委托。',
          confirmText: '去认证',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/verify/verify' })
          }
        })
        return
      }
      if (!this.canSubmit) {
        uni.showToast({ title: this.hint(), icon: 'none' })
        return
      }
      const f = this.form
      // 违规内容由系统（store.createTask）统一检测：命中则不发布并发整改通知
      const r = createTask({
        title: f.title.trim(),
        desc: f.desc.trim(),
        category: f.category,
        budget: Number(f.budget),
        itemPrice: Number(f.itemPrice) || 0,
        proof: f.proof,
        place: f.place.trim(),
        building: f.building,
        deadline: this.deadlineTs,
        urgent: f.urgent,
        anonymous: f.anonymous,
        attachments: f.attachments
      })
      if (!r.ok) {
        if (r.banned) {
          uni.showModal({
            title: '发布被拦截',
            content: `内容包含违规词「${r.banned}」，系统已拦截并给你发送了整改通知。请修改标题或描述后重新发布。`,
            showCancel: false,
            confirmText: '去整改'
          })
        } else {
          uni.showToast({ title: r.msg, icon: 'none' })
        }
        return
      }
      uni.showToast({ title: '发布成功，已在大厅上架', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) uni.navigateBack({ delta: 1 })
        else uni.reLaunch({ url: '/pages/hall/hall' })
      }, 600)
    },
    hint() {
      const f = this.form
      if (!f.category) return '先选一个订单类型'
      if (f.title.trim().length < 4) return '标题至少 4 个字'
      if (f.desc.trim().length < 10) return '描述至少 10 个字'
      if (!(Number(f.budget) > 0)) return '填一下订单报酬'
      if (Number(f.budget) > BUDGET_MAX) return `报酬不能超过 ${BUDGET_MAX} 元`
      if (this.needItemPrice && !(Number(f.itemPrice) > 0)) return '代取代买类要填商品价格'
      if (this.needItemPrice && Number(f.itemPrice) > ITEM_PRICE_MAX) return `商品价格不能超过 ${ITEM_PRICE_MAX} 元`
      if (this.needItemPrice && !f.proof.length) return '代取代买类要上传凭证'
      if (f.place.trim().length < 2) return '填一下交付地点'
      if (!(this.deadlineTs > Date.now())) return '截止时间要晚于现在'
      return '还有信息没填完'
    }
  }
}
</script>

<style scoped>
.body {
  padding: 24rpx 32rpx 200rpx;
}
.ai-seed {
  background-color: #EFF6FF;
  border: 2rpx solid #BFDBFE;
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 20rpx;
}
.ai-seed-text {
  font-size: 24rpx;
  color: #2563EB;
  line-height: 1.5;
}
.card {
  background-color: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
/* 标题卡：放在第一位，加边框和投影强调「先填这里」 */
.card-title {
  border: 2rpx solid #c9d5ff;
  box-shadow: 0 14rpx 32rpx -14rpx rgba(76, 111, 255, 0.3), 0 8rpx 28rpx rgba(76, 111, 255, 0.07);
}
.banned-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: #e0574f;
  line-height: 1.5;
}
.more-toggle {
  font-size: 21rpx;
  color: #4c6fff;
}
.more-body {
  margin-top: 8rpx;
}
.label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #14161f;
  margin-bottom: 18rpx;
}
.mb-0 {
  margin-bottom: 0;
}
.mb-4 {
  margin-bottom: 4rpx;
}
.req {
  color: #f04a4a;
  margin-left: 6rpx;
}
.input-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #14161f;
  height: 72rpx;
  line-height: 72rpx;
}
.input {
  font-size: 28rpx;
  color: #14161f;
  height: 72rpx;
  line-height: 72rpx;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
}
.ph {
  color: #b6bac9;
  font-size: 27rpx;
  font-weight: 400;
}
.counter {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #c3c7d4;
  margin-top: 8rpx;
}
.tpl-hint {
  font-size: 21rpx;
  color: #8b90a3;
}
.tpl-scroll {
  width: 100%;
  white-space: nowrap;
  margin-top: 18rpx;
}
.tpl-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.tpl {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 64rpx;
  padding: 0 22rpx;
  margin-right: 14rpx;
  border-radius: 999rpx;
  background-color: #f2f4fa;
  flex-shrink: 0;
}
.tpl:active {
  background-color: #e8ecfa;
}
.tpl-emoji {
  font-size: 24rpx;
  margin-right: 8rpx;
}
.tpl-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #4a4f63;
  white-space: nowrap;
}
.cats {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 18rpx;
}
.cat {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 68rpx;
  padding: 0 24rpx;
  margin-right: 14rpx;
  margin-bottom: 14rpx;
  border-radius: 999rpx;
  border: 2rpx solid #edeff6;
  background-color: #ffffff;
}
.cat-on {
  box-shadow: 0 8rpx 20rpx rgba(76, 111, 255, 0.2);
}
.cat-emoji {
  font-size: 24rpx;
  margin-right: 8rpx;
}
.cat-name {
  font-size: 25rpx;
  font-weight: 600;
  color: #4a4f63;
}
.cat-on .cat-name {
  color: #ffffff;
}
.cat-tip {
  margin-top: 6rpx;
  background-color: #f7f8fc;
  border-radius: 14rpx;
  padding: 16rpx 18rpx;
}
.cat-tip-text {
  font-size: 21rpx;
  color: #8b90a3;
  line-height: 1.5;
}
.textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 27rpx;
  color: #14161f;
  line-height: 1.65;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
}
.money {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 18rpx;
}
.money-sign {
  font-size: 40rpx;
  font-weight: 700;
  color: #ff8a3d;
  margin-right: 8rpx;
}
.money-input {
  width: 160rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #ff8a3d;
}
.money-quick {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: auto;
}
.quick {
  font-size: 22rpx;
  color: #8b90a3;
  background-color: #f5f6fa;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  margin-left: 8rpx;
  font-weight: 600;
}
.quick-on {
  background-color: #fff2e8;
  color: #ff8a3d;
}
.hint {
  display: block;
  font-size: 20rpx;
  color: #b6bac9;
  margin-top: 10rpx;
  line-height: 1.5;
}
.deposit-tip {
  margin-top: 20rpx;
  background-color: #eef1ff;
  border-radius: 14rpx;
  padding: 16rpx 18rpx;
}
.deposit-tip-text {
  font-size: 21rpx;
  color: #4c6fff;
  line-height: 1.5;
}
.bd-scroll {
  width: 100%;
  white-space: nowrap;
}
.bd-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.bd {
  height: 56rpx;
  padding: 0 22rpx;
  margin-right: 12rpx;
  border-radius: 12rpx;
  background-color: #f5f6fa;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.bd-on {
  background-color: #eef1ff;
}
.bd-text {
  font-size: 23rpx;
  color: #8b90a3;
  font-weight: 600;
}
.bd-text-on {
  color: #4c6fff;
}
.time-row {
  display: flex;
  flex-direction: row;
}
.picker {
  height: 72rpx;
  line-height: 72rpx;
  background-color: #f7f8fc;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #14161f;
  font-weight: 600;
  margin-right: 16rpx;
}
.deadline-tip {
  display: block;
  font-size: 21rpx;
  color: #f04a4a;
  margin-top: 10rpx;
}
.att {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #f7f8fc;
  border-radius: 14rpx;
  padding: 16rpx 18rpx;
  margin-top: 12rpx;
}
.att-icon {
  font-size: 24rpx;
  margin-right: 10rpx;
}
.att-name {
  flex: 1;
  font-size: 24rpx;
  color: #4a4f63;
}
.att-size {
  font-size: 19rpx;
  color: #b6bac9;
  margin-left: 12rpx;
}
.att-del {
  font-size: 22rpx;
  color: #b6bac9;
  padding: 6rpx 10rpx;
}
.att-add {
  margin-top: 14rpx;
  height: 72rpx;
  border: 2rpx dashed #d8dcea;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.att-add-text {
  font-size: 24rpx;
  color: #8b90a3;
}
.rule-tip {
  background-color: #fff8ee;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.rule-tip-text {
  font-size: 22rpx;
  color: #a8621f;
  line-height: 1.5;
}
.submit-inline {
  margin-top: 12rpx;
  margin-bottom: 20rpx;
}
</style>
