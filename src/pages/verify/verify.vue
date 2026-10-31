<template>
  <view class="cc-page">
    <AppHeader title="学生认证" />

    <view class="wrap">
      <!-- 已认证 -->
      <view v-if="info.verified" class="done-card">
        <text class="done-emoji">✅</text>
        <text class="done-title">已完成学生认证</text>
        <text class="done-desc">认证后可以正常发布和接取委托</text>

        <view class="done-rows">
          <view class="done-row">
            <text class="done-label">学号</text>
            <text class="done-value">{{ info.studentId || '—' }}</text>
          </view>
          <view class="done-row">
            <text class="done-label">学校</text>
            <text class="done-value">{{ info.school || '—' }}</text>
          </view>
          <view class="done-row">
            <text class="done-label">真实姓名</text>
            <text class="done-value">{{ info.realName || '—' }}</text>
          </view>
          <view class="done-row">
            <text class="done-label">身份证号</text>
            <text class="done-value">{{ info.idCardMasked || '—' }}</text>
          </view>
        </view>

        <text class="done-tip">认证信息已锁定，如需修改请向管理员提交申请</text>
      </view>

      <!-- 已认证：表单隐藏，改为申请修改入口 -->
      <view v-if="info.verified" class="locked-card">
        <text class="locked-title">为什么不能自己改？</text>
        <text class="locked-desc">学生认证关系到交易安全，完成后不可自行修改。若信息填写有误或学籍变动，请提交申请，管理员核实后会帮你更正。</text>
        <view class="locked-btn" :class="{ 'locked-btn-dim': applied }" @tap="requestChange">
          <text class="locked-btn-text">{{ applied ? '申请已提交' : '申请修改认证' }}</text>
        </view>
      </view>

      <!-- 认证表单 -->
      <view v-if="!info.verified" class="form-card">
        <text class="form-title">填写认证信息</text>
        <text class="form-sub">需填写全部四项，信息只用于校内身份核验，不会展示给其他同学</text>

        <!-- 演示答案：评委照下面填写即可 -->
        <view class="demo-hint">
          <view class="demo-hint-head">
            <text class="demo-hint-title">📋 演示答案（照此填写即可）</text>
            <view class="demo-fill" @tap="fillDemo">
              <text class="demo-fill-text">一键填入</text>
            </view>
          </view>
          <view class="demo-row">
            <text class="demo-k">学号</text>
            <text class="demo-v" selectable>{{ hints.studentId }}</text>
          </view>
          <view class="demo-row">
            <text class="demo-k">学校</text>
            <text class="demo-v" selectable>{{ hints.school }}</text>
          </view>
          <view class="demo-row">
            <text class="demo-k">真实姓名</text>
            <text class="demo-v" selectable>{{ hints.realName }}</text>
          </view>
          <view class="demo-row">
            <text class="demo-k">身份证号</text>
            <text class="demo-v" selectable>{{ hints.idCard }}</text>
          </view>
        </view>

        <view class="field">
          <text class="label">学号</text>
          <input v-model="form.studentId" class="input" type="number" maxlength="12" :placeholder="'演示学号：' + hints.studentId" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">学校</text>
          <input v-model="form.school" class="input" maxlength="30" :placeholder="'演示学校：' + hints.school" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">真实姓名</text>
          <input v-model="form.realName" class="input" maxlength="20" :placeholder="'演示姓名：' + hints.realName" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="label">身份证号</text>
          <input v-model="form.idCard" class="input" maxlength="18" :placeholder="'演示身份证：' + hints.idCard" placeholder-class="ph" />
        </view>

        <text v-if="err" class="err">{{ err }}</text>

        <view class="submit" :class="{ 'submit-dim': !canSubmit }" @tap="onSubmit">
          <text class="submit-text">提交认证</text>
        </view>

        <view class="agree" @tap="goRules">
          <text class="agree-text">提交即表示同意《平台规则》，信息仅用于身份核验</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '../../components/AppHeader.vue'
import {
  currentUser,
  guardLogin,
  verificationOf,
  submitVerification,
  isVerified,
  requestVerificationChange,
  demoVerifyHints
} from '../../utils/store.js'

export default {
  components: { AppHeader },
  data() {
    return {
      info: { verified: false, studentId: '', school: '', realName: '', idCardMasked: '', verifiedAt: 0 },
      form: { studentId: '', school: '', realName: '', idCard: '' },
      hints: { studentId: '', school: '', realName: '', idCard: '' },
      err: '',
      applied: false
    }
  },
  computed: {
    canSubmit() {
      const f = this.form
      return !!(f.studentId && f.school && f.realName && f.idCard)
    }
  },
  onLoad() {
    if (!guardLogin()) return
    this.load()
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      const me = currentUser()
      if (!me) return
      this.info = verificationOf(me)
      // 演示答案：学号自动避开已占用，身份证校验合法
      this.hints = demoVerifyHints()
      // 已填过的信息带出来，方便修改
      this.form.studentId = this.info.studentId || ''
      this.form.school = this.info.school || ''
      this.form.realName = this.info.realName || ''
      this.form.idCard = ''
    },
    fillDemo() {
      this.form.studentId = this.hints.studentId
      this.form.school = this.hints.school
      this.form.realName = this.hints.realName
      this.form.idCard = this.hints.idCard
      this.err = ''
      uni.showToast({ title: '已填入演示信息，点「提交认证」即可', icon: 'none' })
    },
    onSubmit() {
      this.err = ''
      const r = submitVerification(this.form)
      if (!r.ok) {
        this.err = r.msg
        return
      }
      uni.showToast({ title: r.msg, icon: 'success' })
      // 留在本页展示认证结果，用户自己返回
      this.load()
    },
    requestChange() {
      if (this.applied) {
        uni.showToast({ title: '申请已提交，请等待管理员处理', icon: 'none' })
        return
      }
      uni.showModal({
        title: '申请修改认证',
        content: '确认向管理员提交修改学生认证信息的申请？管理员核实后会帮你更正。',
        confirmText: '提交申请',
        success: (res) => {
          if (!res.confirm) return
          const r = requestVerificationChange('')
          uni.showToast({ title: r.msg, icon: 'none' })
          if (r.ok) this.applied = true
        }
      })
    },
    goRules() {
      uni.navigateTo({ url: '/pages/rules/rules' })
    }
  }
}
</script>

<style scoped>
.cc-page {
  min-height: 100vh;
  background-color: #F5F7FB;
}
.wrap {
  padding: 16px 16px 40px;
}
.done-card {
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
  border-radius: 18px;
  padding: 20px 18px 16px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 12px 28px -10px rgba(58, 91, 224, 0.55);
}
.done-emoji {
  font-size: 30px;
}
.done-title {
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  margin-top: 6px;
}
.done-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}
.done-rows {
  width: 100%;
  margin-top: 14px;
  background-color: rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 10px 12px;
  box-sizing: border-box;
}
.done-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
}
.done-label {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.8);
}
.done-value {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}
.done-tip {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10px;
}
.form-card {
  background-color: #ffffff;
  border-radius: 18px;
  padding: 20px 18px 16px;
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.25);
}
/* 已认证锁定说明卡 */
.locked-card {
  background-color: #ffffff;
  border-radius: 18px;
  padding: 20px 18px 18px;
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.25);
}
.locked-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #14161f;
}
.locked-desc {
  display: block;
  font-size: 12.5px;
  color: #6b7080;
  line-height: 1.7;
  margin-top: 8px;
}
.locked-btn {
  margin-top: 16px;
  height: 48px;
  border-radius: 12px;
  background-image: linear-gradient(135deg, #4c6fff, #3a5be0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px -10px rgba(58, 91, 224, 0.6);
}
.locked-btn:active {
  transform: translateY(2px) scale(0.99);
}
.locked-btn-dim {
  background-image: none;
  background-color: #eef1f7;
  box-shadow: none;
}
.locked-btn-text {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1px;
}
.locked-btn-dim .locked-btn-text {
  color: #8b90a3;
}
.form-title {
  font-size: 16px;
  font-weight: 800;
  color: #14161F;
}
.form-sub {
  display: block;
  font-size: 11.5px;
  color: #8B90A3;
  margin-top: 6px;
  margin-bottom: 14px;
  line-height: 1.6;
}
/* 演示答案卡 */
.demo-hint {
  background-color: #eef1ff;
  border: 1.5px solid #c9d5ff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
}
.demo-hint-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.demo-hint-title {
  font-size: 13px;
  font-weight: 800;
  color: #3a5be0;
}
.demo-fill {
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  background-image: linear-gradient(135deg, #4c6fff, #3a5be0);
  display: flex;
  align-items: center;
  box-shadow: 0 6px 14px -6px rgba(58, 91, 224, 0.6);
}
.demo-fill:active {
  transform: translateY(1px) scale(0.97);
}
.demo-fill-text {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}
.demo-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 0;
}
.demo-k {
  width: 72px;
  font-size: 12px;
  color: #6b7080;
}
.demo-v {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #14161f;
  word-break: break-all;
}
.field {
  margin-bottom: 12px;
}
.label {
  display: block;
  font-size: 12px;
  color: #6B7080;
  margin-bottom: 6px;
  font-weight: 600;
}
.input {
  height: 46px;
  background-color: #F7F8FC;
  border: 1.5px solid #EDEFF6;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  color: #14161F;
  box-sizing: border-box;
}
.ph {
  color: #B6BAC9;
}
.err {
  display: block;
  font-size: 12.5px;
  color: #F04A4A;
  margin: 4px 0 10px;
}
.submit {
  height: 48px;
  border-radius: 12px;
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
}
.submit-dim {
  opacity: 0.55;
}
.submit-text {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
}
.agree {
  margin-top: 12px;
}
.agree-text {
  font-size: 11px;
  color: #8B90A3;
  line-height: 1.6;
  text-align: center;
  display: block;
}
</style>
