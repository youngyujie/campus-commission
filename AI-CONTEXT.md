# AI 接手卡 · 校园委托

> 给新会话用的最小上下文。读完这一页就能接着干活，不用翻源码、不用读历史对话。
> 生成于 2026-10-28。

## 一句话现状

uni-app(Vue3) + Vite 的校园委托平台，**12 个页面、学生/管理员双角色、业务闭环全部跑通**，自动化测试 6 套全绿，已静态发布上线。**数据仍在浏览器 localStorage，跨设备不互通** —— 这是唯一待解决的核心短板。

## 路径

```
项目根：C:/Users/HASEE/WorkBuddy AI/2026-10-27-19-04-40/campus-commission
```

- 业务逻辑唯一入口：`src/utils/store.js`（60+ 导出，页面不直接碰存储）
- 插画：`src/utils/art.js`（`CAMPUS_BG` 校园背景、`CLIPBOARD_ART` 剪贴板，内联 SVG dataURL）
- 元信息：`src/utils/constants.js`（分类/状态/信誉/楼栋/违规词/规则）
- 种子数据：`src/utils/seed.js`　账号仓库：`src/utils/vault.js`　文件工具：`src/utils/file.js`
- 页面：`src/pages/` → login hall detail publish orders chat room mine review admin profile rules

## 命令

```bash
NODE="C:/Users/HASEE/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
PY="C:/Users/HASEE/.workbuddy-ai/binaries/python/versions/3.13.12/python.exe"

$NODE node_modules/@dcloudio/vite-plugin-uni/bin/uni.js   # 起 dev server（端口 5180）
$NODE scripts/build-single.js                             # 出单文件版 HTML
$PY   scripts/pack.py                                     # 打提交包 zip
```

测试脚本（`scripts/`，都需先起 dev server）：
`flow2` 全链路 · `flow3` 主页/文件/后台 · `flow4` 钱包/好友/聊天 · `flow5` 学号/押金/凭证 · `flow6` 头像/默认分/首页 · `flow7` 注册登录/可见性 · `flow8` 技能标签 · `flow9` 头像上传/单项编辑 · `flow10` 手机号搜好友/手机端协议 · `reg` 注册 · `shots` 全站截图 · `online` 线上实测

## 账号体系（2026-10-28 改版）

- 注册只要：**用户名**（2-12 位）+ **手机号** + 密码，学号选填。**不再要校园邮箱与真实姓名**
- 登录支持：用户名 / 手机号 / 学号 / 旧邮箱 任填其一
- 旧账号（老版本没有 `username` 字段）在 `init()` 里自动迁移，`username = nickname || name || phone`
- 账号存两份：业务数据 `campus_commission_state_v2` + 账号仓库 `campus_commission_accounts_v1`
- 跨标签页同步靠 `campus_commission_stamp_v1` 变更戳

## 演示账号

```
2023010101 / 123456   林小满（学生）
2022010202 / 123456   陈子昂（学生）
2024010303 / 123456   苏晴（学生）
2023010404 / 123456   周野（学生）
13800000006 / 123456  许一帆（未填学号，用于测门槛）
admin / admin888      张老师（管理员）
```
验证码固定 `123456`。登录页底部有一键登录。

## 线上

```
https://campus-commission-35470.apps.workbuddy.host/?sharecode=L6JLE2TLA6
```

- **sharecode 不能丢，去掉即 403**
- 发布目录：`deploy-site/`（单文件版副本），静态托管
- 管理入口：设置—数据管理—应用

## 登录页（2026-10-28 重做）

- 视觉：绿色校园插画背景（`utils/art.js` 的 `CAMPUS_BG`）+ 米白卡片 `#FDFBF3` + 绿色渐变胶囊按钮
- 桌面端卡片 `max-width: 588px`，内部 `.card-inner` 352px，右侧绝对定位「轻量任务」剪贴板插画；`≤899px` 隐藏插画、卡片贴边
- 结构：`.field` 包 `input.field-input`，右侧可挂 `.field-link`（获取验证码 / 用验证码）；主按钮是 `.submit`
- 登录/注册用「去注册 / 去登录」文字链切换，不再用 tab
- **测试选择器已统一**：输入框 `page.locator('.field input')`，提交按钮 `page.locator('.submit')`，切注册 `getByText('去注册')`

## 资料编辑交互（2026-10-28 改版）

- 头像：`mine.vue` 的 `.avatar-hit` 与 `profile.vue` 的 `onAvatarTap` 都能**直接点** → actionSheet（相册/文件/emoji/恢复默认）
- 图片必须走 `toAvatarDataUrl()`（`utils/file.js`）：canvas 压到 320px + JPEG 0.82，实测 1.8 MB 原图 → 40 KB base64
  **不要直接 `toDataUrl()`**，手机原图 base64 会超过 `AVATAR_MAX_LEN=200000`，表现就是「上传图片失败」
- 资料编辑：主页「我的资料」卡片一行一项，`openField(key)` / `openSkills()` 打开单项弹层，`saveField()` 提交
- 老的整块「编辑资料」弹层已删除（`openEdit`/`saveEdit`/`uploadAvatar` 均已移除）

## 桌面端布局（2026-10-28）

- 端判定：`src/utils/device.js` 的 `isDesktopNow()`（`windowWidth >= 900`）
- 组件 `src/components/SideNav.vue`：桌面左侧固定导航（232px），5 个入口 + 消息未读角标 + 底部用户卡片 + 管理员入口
- 五个主页面（hall / chat / orders / mine / publish）根节点加 `:class="{ 'has-side': isDesktop }"`，
  模板里 `<SideNav v-if="isDesktop" .../>` + `<TabBar v-else .../>`
- 全局样式在 `App.vue` 的 `@media (min-width: 900px)` 里：`.cc-page.has-side { padding-left: 232px }`，
  `.body/.list/.hero-top/.hero-stats/.search/.tabs/.actionbar-inner { max-width: 980px; margin: auto; box-sizing: border-box }`
- 二级页面（详情/聊天室/他人主页/后台）用 `:not(.has-side)` 分支限宽 860px
- **坑**：`App.vue` 的样式必须写在 `<style>` 块**内部**。用 `cat >>` 追加会落到 `</style>` 之后，
  整段被当成文本忽略，表现是「媒体查询完全不生效、padding 还是 0」。
- 新增页面若要有侧边栏：记得 `isDesktop` + SideNav + has-side 三件套，且 `data` 里初始化 `isDesktop: false`

## 后端同步（2026-10-29）

- `server/server.js`：零依赖 Node，一个进程同时给 API 和网页；数据在 `server/data.json`
  - `GET /api/ping` 探活 · `GET /api/state?since=v` 拉全量 · `POST /api/state` 首次初始化 · `POST /api/sync` 增量
  - 合并按集合 `{upsert:[], remove:[]}`，`scalars.seq` 只增不减
- `src/utils/sync.js`：`bootstrap()` 探活→拉取→落地；`schedulePush()` 防抖 350ms 推增量；4s 轮询
  - **连不上 `/api/ping` 就 `enabled=false`，纯本地模式**（静态链接/双击文件照常可用）
  - 支持 `?api=http://xxx` 指定后端
- `store.js`：`SHARED_KEYS`（13 个集合，**sessionUserId 不同步**）、`sharedSnapshot()`、`applyShared()`、`setPersistHook()`、`dataTick`
  - `applyShared` 里用 `suppressPush` 防回环
- 重渲染：`dataTick` 是 Vue ref，hall 的 computed 读它；chat/orders/mine/detail 监听 `uni.$on('state:sync')` 调 `refresh()`
- `scripts/flow14.js`：两个独立浏览器上下文，A 发布 → B 看到；B 注册 → A 按手机号搜到

## 布局收口（2026-10-28 晚）

- 桌面内容区不再 `max-width: 980px` 居中（那会在侧栏右侧和屏幕右边各留 114px 空档），
  改成**铺满 + 左右 28px padding**：`.cc-page.has-side .hero-wrap/.stats-wrap/.filter-wrap/.list/.tabs/.body`
- 双列网格 `.task-grid` 提到 `App.vue` 全局，hall / orders / mine 共用（之前只在 hall 的 scoped 里）
- 筛选区从 4 行（分类 / 楼栋 / 排序 / 计数）压成 **1 行 + 1 行 meta**：
  `.filter-wrap` = 分类 chip（横向滚动，flex:1）+ `.seg` 分段排序；楼栋用 `showActionSheet`
  - 排序标签缩短：智能 / 最新 / 报酬 / 截止
  - 窄屏（<900px）`.seg` 自动换行到第二行，不挤分类
- 实测桌面：hero/stats x=260 w=1152（侧栏 232 + 28 边距），卡片 570 宽双列；手机端不变

## 卡片改版（2026-10-28，按锐评方案 P0）

- `TaskCard.vue` 重写：左侧 3px 类型色条（`task.cat.color`）、1px 边框 `#E2E8F0`、圆角 24rpx、hover 蓝边（`@media (hover:hover)`）
- 状态改成「小圆点 + 文字」放在标题上方，**全卡只出现一次**；过期显示「已流单」红色 + 卡片 `opacity .72`
- 价格 `#0F172A`（不再是橙红），商品价用灰色 chip；红色只留给已流单/已截止
- 右下角**唯一主按钮**：`action` 计算属性按状态给出「立即接单 / 开始处理 / 提交交付 / 去验收」，自己发的单不显示
- 点主按钮 → `detail?id=xx&take=1`，`detail.vue` 的 `onLoad` 里 `setTimeout(280ms)` 后调 `doAction()`，押金不足会自动弹补交层
- 截止时间三档：<30min 橙 `#D97706`「剩 N 分钟」、<24h 中性「今天 HH:MM」、更久灰日期、过期红「已截止」
- 大厅列表加 `.task-grid`，桌面端 `@media (min-width:900px)` 才 `display:grid` 双列；手机端保持单列
  **注意**：不能直接给 `.list` 加 grid——chat/orders 也用 `.list`

## 手机号搜好友（2026-10-28）

- `store.js` 新增 `searchUserByPhone(phone)` + `maskPhone(phone)`
- **只做精确匹配**完整 11 位，不接受前缀（否则可批量枚举全站手机号）
- 排除自己、管理员、被封禁账号；返回昵称/头像/院系/信誉/脱敏手机号 + `relation`（none|requested|friend|incoming）
- 入口在 `chat.vue` 好友 tab 顶部；加好友复用 `requestFriend()`

## 登录页双布局（2026-10-28 追加）

- `login.vue` 用 `isMobile = windowWidth < 900` 分流，**两套独立模板**：`v-if="!isMobile"` 桌面横版 / `v-else` 手机竖版
- 手机端：`utils/art.js` 的 `MOBILE_ART`（清单+纸飞机+教学楼+勾选圆），白色卡片上浮 -44px 压住插画
- **手机端注册必须勾选协议**；桌面端不显示勾选框、也不校验
- `doRegister()` 顺序：字段校验 → 密码长度 → 协议 → `register()`。**顺序不能反**，否则字段错误提示会被协议提示盖住
- 测试选择器要同时兼容两套：输入框 `.m-field input, .field input`，按钮 `.submit, .m-submit`，勾选 `.m-check`

## 硬约束（改代码前必看）

1. 订单报酬、商品价格 **各自 ≤ 200 元**
2. 押金 **50–200**，且 **≥ 订单报酬**；不足需补交；验收通过返还；申诉成立按冻结额 50%（最低 10 元）扣罚
3. 学号 **选填**，未填只能浏览；发单/接单前拦截并引导补填；学号唯一，补填需手机号一致 + 验证码
   （学号判断会回退查账号仓库，避免「填了仍被拦」）
4. 信誉分注册默认 **100**；`< 60` 禁止交易
5. 委托**发布即上架**：代考/代写等违规词发布时前置拦截，合规内容立刻可见；管理员在「审核与下架」可抽查下架
6. 非好友私聊累计 **10 句**上限，超限锁输入并引导加好友（服务端也要判，不能只藏 UI）
7. 首页四项统计与个人主页**必须同源**：我发布的 / 我接取的 / 我完成的 / 我的评分
8. 技能标签：**单个 ≤4 字、最多 8 个**，去重；`SKILL_TAGS`（30 个现成）在 `constants.js`，老数据由 `migrateUsers()` 自动截断

## 已知坑

- uni-app H5 的 `uni.setStorageSync` 在 localStorage 里包了 `{type,data}`，直读要取 `.data`
- H5 hash 跳转**不重载页面**，测试断言前先 `goto('about:blank')`
- `onLoad` + `onShow` 都跳转会触发未处理 rejection，用 `guardLogin()` 只跳一次
- 内联 HTML 必须用 `replace(re, () => payload)`，传字符串会被 `$&` / `$1` 破坏
- `src/components/` 内互相引用用 `./X.vue`，写成 `../../components/` 会整页 500（报错只显示「连接服务器超时」）
- 批量脚本替换大段代码后**必须 grep 导出函数**，曾把 `loginByCode` 一起删掉导致白屏
- 打包用 Python `zipfile`，PowerShell `Compress-Archive` 中文名乱码

## 待办（按优先级）

1. **真后端**：Node.js + SQLite 单进程，前端静态文件同进程托管。`store.js` 的同步函数改异步 API，页面加 `await`。临时聊天 10 句、押金必须在服务端判
2. 平台云服务（`workbuddy_cloud_service`）已试 4 次未成：3 次超时/取消，1 次平台资源池空，恢复时间未知
3. 演示视频未拍（脚本在 README 第七节）
