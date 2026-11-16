<template>
  <view class="auth">
    <!-- ============ 桌面端 ============ -->
    <view v-if="!isMobile" class="d-wrap">
    <!-- 校园插画背景（内联 SVG，离线可用；蓝紫配色版） -->
    <CampusBackdrop class="bg" variant="desk" />
    <view class="veil"></view>

    <!-- 顶部品牌 -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 16 + 'px' }">
      <view class="brand">
        <view class="brand-mark">
          <text class="brand-mark-text">校</text>
        </view>
        <text class="brand-name">校园委托</text>
      </view>
    </view>

    <text class="slogan">放心托付，靠谱接单</text>

    <view class="panel">
      <view class="card" :key="'card-' + mode">
        <view class="card-inner">
          <text class="card-title">{{ isLogin ? '欢迎回来' : '欢迎注册' }}</text>
          <text class="card-sub">{{ subtitle }}</text>

          <!-- 登录：手机号 + 密码 -->
          <template v-if="isLogin">
            <view class="field">
              <input
                v-model="form.phone"
                class="field-input"
                type="number"
                maxlength="11"
                placeholder="手机号"
                placeholder-class="ph"
              />
            </view>
            <view class="field">
              <input
                v-model="form.password"
                class="field-input"
                :password="loginMode === 'pwd'"
                :type="loginMode === 'code' ? 'number' : 'text'"
                :maxlength="loginMode === 'code' ? 6 : 30"
                :placeholder="loginMode === 'pwd' ? '密码' : '验证码（演示 123456）'"
                placeholder-class="ph"
              />
            </view>
            <view class="mode-row">
              <text class="mode-link" @tap="toggleLoginMode">
                {{ loginMode === 'pwd' ? '忘记密码？用验证码登录' : '← 用密码登录' }}
              </text>
              <text v-if="loginMode === 'code'" class="mode-fill" @tap="form.password = '123456'">填入 123456</text>
            </view>
          </template>

          <!-- 注册：用户名 + 手机号 + 密码（学号进系统后再补） -->
          <template v-else>
            <view class="field">
              <input
                v-model="reg.username"
                class="field-input"
                maxlength="12"
                placeholder="用户名（2-12 位）"
                placeholder-class="ph"
              />
            </view>
            <view class="field">
              <input
                v-model="reg.phone"
                class="field-input"
                type="number"
                maxlength="11"
                placeholder="手机号"
                placeholder-class="ph"
              />
            </view>
            <view class="field">
              <input
                v-model="reg.password"
                class="field-input"
                password
                placeholder="设置密码（至少 6 位）"
                placeholder-class="ph"
              />
            </view>
          </template>

          <text v-if="err" class="err">{{ err }}</text>

          <view class="submit" :class="{ 'submit-dim': submitting }" @tap="onSubmit">
            <text class="submit-text">{{ submitting ? '请稍候…' : (isLogin ? '立即登录' : '立即注册') }}</text>
          </view>

          <view class="switch-line">
            <text class="switch-hint">{{ isLogin ? '还没有账号？' : '已有账号？' }}</text>
            <text class="switch-link" @tap="toggleMode">{{ isLogin ? '去注册' : '去登录' }}</text>
            <text v-if="isLogin" class="switch-sep">·</text>
            <text v-if="isLogin" class="switch-link" @tap="goReset">修改密码</text>
          </view>

          <!-- 用户协议（登录/注册共用，按钮下方） -->
          <view class="agree-row" @tap="agreed = !agreed">
            <view class="agree-check" :class="{ 'agree-check-on': agreed }">
              <text v-if="agreed" class="agree-tick">✓</text>
            </view>
            <text class="agree-text">我已阅读并同意<text class="agree-link" @tap.stop="goRules">《用户协议》</text></text>
          </view>
        </view>

        <!-- 侧边小插画（桌面端显示） -->
        <view class="side">
          <text class="side-title">轻量任务</text>
          <CampusBackdrop class="side-art" variant="clip" />
        </view>
      </view>

      <!-- 本机已注册账号：自查用（共享模式下不显示） -->
      <view v-if="localList.length" class="local">
        <view class="local-head" @tap="showLocal = !showLocal">
          <text class="local-title">本机已注册 {{ localList.length }} 个账号</text>
          <text class="local-toggle">{{ showLocal ? '收起 ▴' : '查看 ▾' }}</text>
        </view>
        <view v-if="showLocal" class="local-list">
          <view v-for="u in localList" :key="u.id" class="local-item" @tap="fillLocal(u)">
            <text class="local-emoji">{{ u.avatar }}</text>
            <text class="local-name">{{ u.nickname }}</text>
            <text class="local-phone">{{ u.phoneMasked || '未填手机号' }}</text>
          </view>
          <text class="local-tip">
            账号只存在当前浏览器里。换手机、换浏览器，或清理过浏览器数据，都需要重新注册。
          </text>
        </view>
      </view>

      <!-- 演示账号 -->
      <view class="demo">
        <text class="demo-title">演示账号 · 点一下直接进</text>
        <view class="demo-list">
          <view v-for="d in demoAccounts" :key="d.acc" class="demo-item" @tap="quickLogin(d)">
            <text class="demo-emoji">{{ d.emoji }}</text>
            <text class="demo-name">{{ d.name }}</text>
          </view>
        </view>
      </view>
    </view>
    </view>

    <!-- ============ 手机端 ============ -->
    <view v-else class="m">
      <CampusBackdrop class="m-art" variant="mobile" />

      <view class="m-card" :key="'mcard-' + mode">
        <text class="m-title">{{ isLogin ? '欢迎回来' : '创建账号' }}</text>

        <template v-if="isLogin">
          <view class="m-field">
            <input v-model="form.phone" class="m-input" type="number" maxlength="11" placeholder="手机号" placeholder-class="m-ph" />
          </view>
          <view class="m-field">
            <input
              v-model="form.password"
              class="m-input"
              :password="loginMode === 'pwd'"
              :type="loginMode === 'code' ? 'number' : 'text'"
              :maxlength="loginMode === 'code' ? 6 : 30"
              :placeholder="loginMode === 'pwd' ? '密码' : '验证码（演示 123456）'"
              placeholder-class="m-ph"
            />
          </view>
          <view class="m-mode">
            <text class="m-mode-link" @tap="toggleLoginMode">
              {{ loginMode === 'pwd' ? '忘记密码？用验证码登录' : '← 用密码登录' }}
            </text>
            <text v-if="loginMode === 'code'" class="m-mode-fill" @tap="form.password = '123456'">填入 123456</text>
          </view>
        </template>

        <template v-else>
          <view class="m-field">
            <input v-model="reg.username" class="m-input" maxlength="12" placeholder="昵称（2-12 位）" placeholder-class="m-ph" />
          </view>
          <view class="m-field">
            <input v-model="reg.phone" class="m-input" type="number" maxlength="11" placeholder="手机号" placeholder-class="m-ph" />
          </view>
          <view class="m-field">
            <input v-model="reg.password" class="m-input" password placeholder="设置密码（至少 6 位）" placeholder-class="m-ph" />
          </view>
        </template>

        <text v-if="err" class="m-err">{{ err }}</text>

        <view class="m-submit" :class="{ 'm-submit-dim': submitting }" @tap="onSubmit">
          <text class="m-submit-text">{{ submitting ? '请稍候…' : (isLogin ? '立即登录' : '立即注册') }}</text>
        </view>

        <!-- 用户协议（登录/注册共用，按钮下方） -->
        <view class="m-agree" @tap="agreed = !agreed">
          <view class="m-check" :class="{ 'm-check-on': agreed }">
            <text v-if="agreed" class="m-check-tick">✓</text>
          </view>
          <text class="m-agree-text">我已阅读并同意<text class="m-agree-link" @tap.stop="goRules">《用户协议》</text></text>
        </view>

        <view class="m-switch">
          <text class="m-switch-hint">{{ isLogin ? '没有账号？' : '已有账号？' }}</text>
          <text class="m-switch-link" @tap="toggleMode">{{ isLogin ? '去注册' : '返回登录' }}</text>
          <text v-if="isLogin" class="m-switch-sep">·</text>
          <text v-if="isLogin" class="m-switch-link" @tap="goReset">修改密码</text>
        </view>
      </view>

      <view v-if="localList.length" class="m-local">
        <view class="local-head" @tap="showLocal = !showLocal">
          <text class="local-title">本机已注册 {{ localList.length }} 个账号</text>
          <text class="local-toggle">{{ showLocal ? '收起 ▴' : '查看 ▾' }}</text>
        </view>
        <view v-if="showLocal" class="local-list">
          <view v-for="u in localList" :key="u.id" class="local-item" @tap="fillLocal(u)">
            <text class="local-emoji">{{ u.avatar }}</text>
            <text class="local-name">{{ u.nickname }}</text>
            <text class="local-phone">{{ u.phoneMasked || '未填手机号' }}</text>
          </view>
          <text class="local-tip">
            账号只存在当前浏览器里。换手机、换浏览器，或清理过浏览器数据，都需要重新注册。
          </text>
        </view>
      </view>

      <view class="m-demo">
        <text class="m-demo-title">演示账号 · 点一下直接进</text>
        <view class="m-demo-list">
          <view v-for="d in demoAccounts" :key="d.acc" class="m-demo-item" @tap="quickLogin(d)">
            <text class="m-demo-emoji">{{ d.emoji }}</text>
            <text class="m-demo-name">{{ d.name }}</text>
          </view>
        </view>
      </view>
    </view>
    <!-- 修改密码 -->
    <view v-if="showReset" class="reset-mask" @tap="showReset = false">
      <view class="reset-sheet" @tap.stop>
        <text class="reset-title">修改密码</text>
        <text class="reset-sub">手机号 + 验证码 123456 + 新密码</text>
        <view class="reset-field">
          <input v-model="resetForm.phone" class="reset-input" type="number" maxlength="11" placeholder="手机号" placeholder-class="ph" />
        </view>
        <view class="reset-field">
          <input v-model="resetForm.code" class="reset-input" type="number" maxlength="6" placeholder="验证码（演示 123456）" placeholder-class="ph" />
        </view>
        <view class="reset-field">
          <input v-model="resetForm.password" class="reset-input" password placeholder="新密码（至少 6 位）" placeholder-class="ph" />
        </view>
        <view class="reset-field">
          <input v-model="resetForm.confirm" class="reset-input" password placeholder="再输一次新密码" placeholder-class="ph" />
        </view>
        <text v-if="resetErr" class="reset-err">{{ resetErr }}</text>
        <view class="reset-actions">
          <view class="reset-btn reset-btn-ghost" @tap="showReset = false">
            <text class="reset-btn-ghost-text">取消</text>
          </view>
          <view class="reset-btn reset-btn-primary" :class="{ 'reset-btn-dim': resetSubmitting }" @tap="doReset">
            <text class="reset-btn-primary-text">{{ resetSubmitting ? '提交中…' : '确认修改' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 访问口令门：服务端开启了口令时挡住 -->
    <view v-if="needKey" class="keygate">
      <view class="keygate-card">
        <text class="keygate-title">需要访问口令</text>
        <text class="keygate-desc">这个站点只对内部开放。输入管理员给的访问口令，或直接用带口令的完整链接打开。</text>
        <input
          v-model="keyInput"
          class="keygate-input"
          placeholder="访问口令"
          placeholder-class="ph"
          confirm-type="done"
          @confirm="submitKey"
        />
        <text v-if="keyErr" class="keygate-err">{{ keyErr }}</text>
        <view class="keygate-btn" @tap="submitKey">
          <text class="keygate-btn-text">进入</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { login, loginByCode, register, resetPassword, currentUser, validateCampusIdentity, localAccounts } from '../../utils/store.js'
import CampusBackdrop from '../../components/CampusBackdrop.vue'
import { bootstrapOnce, reconnect } from '../../utils/sync.js'

export default {
  components: { CampusBackdrop },
  data() {
    return {
      statusBarHeight: 0,
      mode: 'login',
      err: '',
      needKey: false,
      keyInput: '',
      keyErr: '',
      isMobile: false,
      agreed: false,
      loginMode: 'pwd',
      submitting: false,
      showReset: false,
      resetSubmitting: false,
      resetErr: '',
      resetForm: { phone: '', code: '123456', password: '', confirm: '' },
      localList: [],
      showLocal: false,
      form: { phone: '', password: '' },
      reg: { username: '', phone: '', studentId: '', password: '' },
      demoAccounts: [
        { acc: '13800000001', pwd: '123456', name: '林小满', emoji: '🐰', role: '学生' },
        { acc: '13800000006', pwd: '123456', name: '许一帆', emoji: '🐧', role: '受限' },
        { acc: '13800000000', pwd: 'admin888', name: '张老师', emoji: '🧑‍🏫', role: '管理员' }
      ]
    }
  },
  computed: {
    isLogin() {
      return this.mode === 'login'
    },
    subtitle() {
      if (!this.isLogin) return '用户名 + 手机号 + 密码，学号注册后再补'
      return '用注册时的手机号和密码登录'
    }
  },
  onLoad() {
    try {
      const info = uni.getSystemInfoSync()
      this.statusBarHeight = info.statusBarHeight || 0
      this.isMobile = (info.windowWidth || 375) < 900
    } catch (e) {
      this.statusBarHeight = 0
      this.isMobile = true
    }
    this.localList = localAccounts()
    // 等启动同步跑完，才知道服务端要不要口令
    bootstrapOnce().then((r) => {
      if (r === 'needkey') this.needKey = true
      // 连上后端后「本机账号」就没有意义了，重新取一次让它消失
      this.localList = localAccounts()
    })
    if (currentUser()) uni.reLaunch({ url: '/pages/hall/hall' })
  },
  onUnload() {
    if (typeof uni.offWindowResize === 'function' && this._onResize) {
      uni.offWindowResize(this._onResize)
      this._onResize = null
    }
  },
  methods: {
    toggleMode() {
      this.mode = this.isLogin ? 'register' : 'login'
      this.err = ''
    },
    // 密码登录 / 验证码登录切换（演示验证码固定 123456）
    toggleLoginMode() {
      this.loginMode = this.loginMode === 'pwd' ? 'code' : 'pwd'
      this.form.password = ''
      this.err = ''
    },
    async onSubmit() {
      if (this.isLogin) await this.doLogin()
      else await this.doRegister()
    },
    async doLogin() {
      this.err = ''
      if (!/^1\d{10}$/.test(String(this.form.phone || ''))) {
        this.err = '请输入 11 位手机号'
        return
      }
      if (!this.form.password) {
        this.err = this.loginMode === 'code' ? '请输入验证码' : '请输入密码'
        return
      }
      if (!this.agreed) {
        uni.showToast({ title: '请先勾选同意《用户协议》', icon: 'none' })
        return
      }
      if (this.submitting) return
      this.submitting = true
      try {
        // 等后端探测完成再登录：否则慢网时 isServerUp 还是 false，会误走本地模式
        await bootstrapOnce()
        const r =
          this.loginMode === 'code'
            ? await loginByCode({ phone: this.form.phone, code: this.form.password })
            : await login({ account: this.form.phone, password: this.form.password })
        if (!r.ok) {
          this.err = r.msg
          this.localList = localAccounts()
          this.showLocal = true
          return
        }
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/hall/hall' }), 400)
      } finally {
        this.submitting = false
      }
    },
    // 修改密码：手机号 + 验证码 123456 + 新密码
    goReset() {
      this.resetForm.phone = this.form.phone || ''
      this.resetForm.code = '123456'
      this.resetForm.password = ''
      this.resetForm.confirm = ''
      this.resetErr = ''
      this.showReset = true
    },
    async doReset() {
      if (this.resetSubmitting) return
      const f = this.resetForm
      if (!/^1\d{10}$/.test(String(f.phone || '').trim())) {
        this.resetErr = '请输入 11 位手机号'
        return
      }
      if (String(f.code || '') !== '123456') {
        this.resetErr = '验证码不正确（演示码 123456）'
        return
      }
      if (!f.password || String(f.password).length < 6) {
        this.resetErr = '新密码至少 6 位'
        return
      }
      if (f.password !== f.confirm) {
        this.resetErr = '两次输入的新密码不一致'
        return
      }
      this.resetSubmitting = true
      try {
        await bootstrapOnce()
        const r = await resetPassword({
          phone: String(f.phone || '').trim(),
          code: String(f.code || ''),
          newPassword: String(f.password || '')
        })
        if (!r.ok) {
          this.resetErr = r.msg
          return
        }
        this.showReset = false
        this.mode = 'login'
        this.loginMode = 'pwd'
        this.form.phone = String(f.phone || '').trim()
        this.form.password = ''
        this.err = ''
        uni.showToast({ title: r.msg, icon: 'none' })
      } finally {
        this.resetSubmitting = false
      }
    },
    async quickLogin(d) {
      // 和手动登录一样先等后端探测完成：否则点太快会走「本地登录」，
      // 页面显示已登录但服务端没有会话，之后所有接口都返回 401（半登录状态）
      await bootstrapOnce()
      const r = await login({ account: d.acc, password: d.pwd })
      if (!r.ok) {
        this.err = r.msg
        return
      }
      uni.showToast({ title: '已登录 ' + d.name, icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/hall/hall' }), 400)
    },
    async doRegister() {
      this.err = ''
      // 先校验字段，再校验协议，错误提示才不会被协议盖住
      const v = validateCampusIdentity(this.reg)
      if (v) {
        this.err = v
        return
      }
      if (!this.reg.password || String(this.reg.password).length < 6) {
        this.err = '密码至少 6 位'
        return
      }
      if (!this.agreed) {
        uni.showToast({ title: '请先勾选同意《用户协议》', icon: 'none' })
        return
      }
      if (this.submitting) return
      this.submitting = true
      try {
        // 注册前也要等后端探测完成，否则账号会写进本地而不是服务端
        await bootstrapOnce()
        const r = await register(this.reg)
        if (!r.ok) {
          this.err = r.msg
          return
        }
        uni.showToast({ title: r.msg, icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/hall/hall' }), 600)
      } finally {
        this.submitting = false
      }
    },
    fillLocal(u) {
      this.err = ''
      this.mode = 'login'
      this.form.phone = u.phone || ''
      this.form.password = ''
    },
    async submitKey() {
      const v = String(this.keyInput || '').trim()
      if (!v) {
        this.keyErr = '请输入访问口令'
        return
      }
      this.keyErr = ''
      uni.showLoading({ title: '验证中' })
      const r = await reconnect(v)
      uni.hideLoading()
      // 'needlogin' 也算通过：口令对了，只是还没登录
      if (r === true || r === 'needlogin') {
        this.needKey = false
        this.localList = localAccounts()
        uni.showToast({ title: '口令正确', icon: 'success' })
        return
      }
      this.keyErr = '口令不对，检查一下大小写'
    },
    goRules() {
      uni.navigateTo({ url: '/pages/rules/rules' })
    }
  }
}
</script>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .card,
  .m-card,
  .card-inner > *,
  .m-card > * {
    animation: none !important;
  }
}

.auth {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
}
.d-wrap {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 40px;
  box-sizing: border-box;
}
.bg {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}
.veil {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46vh;
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.62));
  z-index: 1;
}

/* 顶部 */
.topbar {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1080px;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.brand {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-image: linear-gradient(135deg, #6B8AFF, #3A5BE0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(58, 91, 224, 0.28);
}
.brand-mark-text {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
}
.brand-name {
  font-size: 19px;
  font-weight: 800;
  color: #14161F;
  margin-left: 12px;
  letter-spacing: 1px;
}

.slogan {
  position: relative;
  z-index: 2;
  margin-top: 26px;
  font-size: 17px;
  font-weight: 600;
  color: #4A4F63;
  letter-spacing: 1.5px;
}

/* 卡片区 */
.panel {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 588px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 22px;
}
/* 卡片升起：从下方浮上来并放大到位 */
@keyframes cardRise {
  0% {
    opacity: 0;
    transform: translate3d(0, 34px, 0) scale(0.955);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
/* 内容逐行浮现 */
@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translate3d(0, 14px, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.card {
  position: relative;
  width: 100%;
  background-color: #FFFFFF;
  background-image: linear-gradient(180deg, #FFFFFF 0%, #F7F8FC 100%);
  border-radius: 26px;
  padding: 38px 42px 26px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.06);
  /* 立体感：顶部高光 + 底部暗边 + 四层黑色投影（近处清晰、远处扩散） */
  box-shadow:
    0 2px 0 rgba(255, 255, 255, 0.95) inset,
    0 -2px 0 rgba(0, 0, 0, 0.07) inset,
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 0 26px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.16),
    0 10px 22px -4px rgba(0, 0, 0, 0.34),
    0 30px 60px -14px rgba(0, 0, 0, 0.4),
    0 70px 130px -34px rgba(0, 0, 0, 0.5);
  animation: cardRise 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform, opacity;
}

/* 卡片里的每一行依次浮现 */
.card-inner > * {
  animation: fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card-inner > *:nth-child(1) { animation-delay: 0.1s; }
.card-inner > *:nth-child(2) { animation-delay: 0.16s; }
.card-inner > *:nth-child(3) { animation-delay: 0.22s; }
.card-inner > *:nth-child(4) { animation-delay: 0.28s; }
.card-inner > *:nth-child(5) { animation-delay: 0.34s; }
.card-inner > *:nth-child(6) { animation-delay: 0.4s; }
.card-inner > *:nth-child(7) { animation-delay: 0.46s; }
.card-inner > *:nth-child(n + 8) { animation-delay: 0.52s; }
.card-inner {
  max-width: 352px;
}
.card-title {
  display: block;
  font-size: 26px;
  font-weight: 800;
  color: #14161F;
  text-align: center;
  letter-spacing: 2px;
}
.card-sub {
  display: block;
  font-size: 12.5px;
  color: #8B90A3;
  text-align: center;
  margin-top: 10px;
  line-height: 1.6;
}

.field {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 52px;
  margin-top: 14px;
  padding: 0 18px;
  background-color: #FFFFFF;
  border: 1.5px solid #EDEFF6;
  border-radius: 14px;
  box-sizing: border-box;
}
.field-input {
  flex: 1;
  height: 52px;
  font-size: 14.5px;
  color: #14161F;
}
.ph {
  color: #B6BAC9;
  font-size: 14px;
}
.field-link {
  font-size: 12.5px;
  font-weight: 700;
  color: #4C6FFF;
  padding-left: 12px;
}
.inline-switch {
  display: block;
  font-size: 12.5px;
  color: #8B90A3;
  margin-top: 12px;
  text-align: right;
}

.err {
  display: block;
  font-size: 12.5px;
  color: #F04A4A;
  margin-top: 14px;
  text-align: center;
  line-height: 1.5;
}

.submit {
  height: 54px;
  margin-top: 22px;
  border-radius: 999px;
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 26px rgba(76, 111, 255, 0.34);
}
.submit-text {
  font-size: 17px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 4px;
}

.switch-line {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 18px;
}
.switch-hint {
  font-size: 13px;
  color: #8B90A3;
}
.switch-link {
  font-size: 13px;
  font-weight: 700;
  color: #4C6FFF;
  margin-left: 6px;
}
/* 密码 / 验证码登录切换 */
.mode-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: -2px 2px 8px;
}
.mode-link {
  font-size: 12px;
  color: #4c6fff;
}
.mode-fill {
  font-size: 12px;
  font-weight: 700;
  color: #ff8a3d;
}
.agree-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}
.agree-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #D8DCEA;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
}
.agree-check-on {
  background-color: #4C6FFF;
  border-color: #4C6FFF;
}
.agree-tick {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
}
.agree-text {
  font-size: 11px;
  color: #B6BAC9;
  line-height: 1.6;
  text-align: center;
}
.agree-link {
  color: #4C6FFF;
  font-weight: 600;
}

/* 侧边插画 */
.side {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  width: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.side-title {
  font-size: 12px;
  font-weight: 700;
  color: #4A4F63;
  margin-bottom: 8px;
}
.side-art {
  width: 108px;
}

/* 访问口令门 */
.keygate {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  background-color: rgba(18, 26, 22, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  box-sizing: border-box;
}
.keygate-card {
  width: 100%;
  max-width: 360px;
  background-color: #ffffff;
  border-radius: 18px;
  padding: 26px 22px 20px;
  box-sizing: border-box;
}
.keygate-title {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #14161F;
  text-align: center;
}
.keygate-desc {
  display: block;
  font-size: 12.5px;
  color: #8B90A3;
  line-height: 1.7;
  margin-top: 10px;
  text-align: center;
}
.keygate-input {
  height: 48px;
  margin-top: 16px;
  padding: 0 16px;
  border: 1.5px solid #EDEFF6;
  border-radius: 999px;
  font-size: 15px;
  color: #14161F;
  background-color: #F7F8FC;
  box-sizing: border-box;
}
.keygate-err {
  display: block;
  font-size: 12.5px;
  color: #F04A4A;
  margin-top: 10px;
  text-align: center;
}
.keygate-btn {
  height: 48px;
  margin-top: 16px;
  border-radius: 999px;
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.keygate-btn-text {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
}

/* 本机账号自查 */
.local,
.m-local {
  width: 100%;
  margin-top: 16px;
}
.m-local {
  margin: 18px 16px 0;
  width: auto;
}
.local-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.local-title {
  font-size: 12px;
  color: #8B90A3;
}
.local-toggle {
  font-size: 12px;
  font-weight: 700;
  color: #4C6FFF;
  margin-left: 6px;
}
.local-list {
  margin-top: 10px;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.9);
}
.local-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
}
.local-item:active {
  background-color: #EEF1FF;
}
.local-emoji {
  font-size: 14px;
  margin-right: 8px;
}
.local-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #4A4F63;
  flex: 1;
}
.local-phone {
  font-size: 12px;
  color: #8B90A3;
  font-family: Menlo, Consolas, monospace;
}
.local-tip {
  display: block;
  font-size: 11px;
  color: #8B90A3;
  line-height: 1.6;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #EDEFF6;
}

/* 演示账号 */
.demo {
  width: 100%;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.demo-title {
  font-size: 12px;
  color: #8B90A3;
  margin-bottom: 10px;
}
.demo-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}
.demo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  margin: 0 6px 8px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 14px rgba(76, 111, 255, 0.08);
}
.demo-emoji {
  font-size: 15px;
  margin-right: 6px;
}
.demo-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #4A4F63;
}


/* ============ 手机端布局 ============ */
.m {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(to bottom, #E7ECFF, #FBFCFE);
  padding-bottom: 28px;
  box-sizing: border-box;
}
.m-art {
  width: 100%;
  display: block;
}
.m-card {
  position: relative;
  z-index: 2;
  margin: -44px 16px 0;
  background-color: #FFFFFF;
  background-image: linear-gradient(180deg, #FFFFFF 0%, #FBFCFE 100%);
  border-radius: 26px;
  padding: 26px 22px 20px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.05);
  /* 压在插画上，靠阴影把它「抬起来」 */
  box-shadow:
    0 2px 0 rgba(255, 255, 255, 0.95) inset,
    0 -2px 0 rgba(0, 0, 0, 0.07) inset,
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 0 22px rgba(0, 0, 0, 0.1),
    0 2px 6px rgba(0, 0, 0, 0.14),
    0 9px 20px -4px rgba(0, 0, 0, 0.3),
    0 24px 46px -12px rgba(0, 0, 0, 0.36),
    0 48px 88px -24px rgba(0, 0, 0, 0.42);
  animation: cardRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform, opacity;
}

/* 手机端内容逐行浮现 */
.m-card > * {
  animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.m-card > *:nth-child(1) { animation-delay: 0.08s; }
.m-card > *:nth-child(2) { animation-delay: 0.14s; }
.m-card > *:nth-child(3) { animation-delay: 0.2s; }
.m-card > *:nth-child(4) { animation-delay: 0.26s; }
.m-card > *:nth-child(5) { animation-delay: 0.32s; }
.m-card > *:nth-child(6) { animation-delay: 0.38s; }
.m-card > *:nth-child(7) { animation-delay: 0.44s; }
.m-card > *:nth-child(n + 8) { animation-delay: 0.5s; }
.m-title {
  display: block;
  font-size: 21px;
  font-weight: 800;
  color: #14161F;
  text-align: center;
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}
.m-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 52px;
  margin-top: 14px;
  padding: 0 18px;
  border: 1.5px solid #EDEFF6;
  border-radius: 999px;
  background-color: #F7F8FC;
  box-sizing: border-box;
}
.m-input {
  flex: 1;
  height: 52px;
  font-size: 14.5px;
  color: #14161F;
}
.m-ph {
  color: #B6BAC9;
  font-size: 14px;
}
.m-link {
  font-size: 12.5px;
  font-weight: 700;
  color: #4C6FFF;
  padding-left: 10px;
}
.m-inline {
  display: block;
  text-align: right;
  font-size: 12.5px;
  color: #8B90A3;
  margin-top: 12px;
}
.m-err {
  display: block;
  font-size: 12.5px;
  color: #F04A4A;
  margin-top: 12px;
  text-align: center;
  line-height: 1.5;
}
.m-agree {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
}
.m-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #D8DCEA;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
}
.m-check-on {
  background-color: #4C6FFF;
  border-color: #4C6FFF;
}
.m-check-tick {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
}
.m-agree-text {
  font-size: 12px;
  color: #8B90A3;
}
.m-agree-link {
  color: #4C6FFF;
  font-weight: 600;
}
.m-submit {
  height: 52px;
  margin-top: 20px;
  border-radius: 999px;
  background-image: linear-gradient(135deg, #4C6FFF, #3A5BE0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px rgba(76, 111, 255, 0.3);
}
.m-submit-text {
  font-size: 16px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 3px;
}
.m-switch {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
}
/* 手机端：密码 / 验证码登录切换 */
.m-mode {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: -4px 4px 10px;
}
.m-mode-link {
  font-size: 12px;
  color: #4c6fff;
}
.m-mode-fill {
  font-size: 12px;
  font-weight: 700;
  color: #ff8a3d;
}
.m-switch-hint {
  font-size: 13px;
  color: #8B90A3;
}
.m-switch-link {
  font-size: 13px;
  font-weight: 700;
  color: #4C6FFF;
  margin-left: 4px;
}
.m-demo {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.m-demo-title {
  font-size: 11.5px;
  color: #8B90A3;
  margin-bottom: 10px;
}
.m-demo-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}
.m-demo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  margin: 0 5px 8px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #EDEFF6;
}
.m-demo-emoji {
  font-size: 13px;
  margin-right: 5px;
}
.m-demo-name {
  font-size: 12px;
  font-weight: 600;
  color: #4A4F63;
}

/* 窄屏时桌面样式不再生效，这里只兜底 */
@media screen and (max-width: 899px) {
  .side {
    display: none;
  }
}

/* 密码 / 验证码切换的间隔点 */
.switch-sep,
.m-switch-sep {
  font-size: 13px;
  color: #b6bac9;
  margin: 0 6px;
}
.submit-dim,
.m-submit-dim {
  opacity: 0.7;
  pointer-events: none;
}

/* 修改密码弹层 */
.reset-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 200;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.reset-sheet {
  width: 100%;
  max-width: 520px;
  background-color: #ffffff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 22px 20px calc(22px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  animation: cc-pop 0.22s ease both;
}
.reset-title {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #14161f;
}
.reset-sub {
  display: block;
  font-size: 12px;
  color: #8b90a3;
  margin: 6px 0 16px;
}
.reset-field {
  margin-bottom: 10px;
}
.reset-input {
  height: 46px;
  background-color: #f5f7fb;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  color: #14161f;
  box-sizing: border-box;
}
.reset-err {
  display: block;
  font-size: 12px;
  color: #e0574f;
  margin: 4px 2px 8px;
}
.reset-actions {
  display: flex;
  flex-direction: row;
  margin-top: 8px;
}
.reset-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reset-btn:active {
  transform: translateY(1px) scale(0.99);
}
.reset-btn-ghost {
  background-color: #f1f3fa;
  margin-right: 12px;
}
.reset-btn-ghost-text {
  font-size: 15px;
  font-weight: 700;
  color: #4a4f63;
}
.reset-btn-primary {
  background-image: linear-gradient(135deg, #4c6fff, #3a5be0);
  box-shadow: 0 12px 24px -10px rgba(58, 91, 224, 0.6);
}
.reset-btn-primary-text {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}
.reset-btn-dim {
  opacity: 0.7;
  pointer-events: none;
}
</style>
