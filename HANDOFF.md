# 交接文档 · 校园委托

> ⚠️ **做前端请先读 [`前端交接文档.md`](./前端交接文档.md)**（滚动更新，含设计系统、组件清单、踩坑、测试体系）。
> 本文是**业务/后端视角**的旧版交接，部分内容（如「学号选填」）已被**学生认证**取代，以新文档为准。

> 最后更新 2026-10-27 22:45。目标：让一个全新的会话在不读历史对话的情况下能直接接着干。
> 先读「0. 一句话现状」和「9. 下一步」，再按需查其它章节。

---

## 0. 一句话现状

已按用户最新规则改造成**小额校园互助平台（网页版）**：去掉报价改**自由接单**，接单需缴**押金（50-200，不低于订单价）**，订单有**公开交流区**，代取类需填**商品价格 + 凭证**，报酬上限 **200**；学号改为**选填**，未填只能浏览，补填需**手机验证**；账号存进**独立仓库**，业务数据清空后仍能登录。自动化验证 **flow2 15/15 + flow3 12/12 + flow4 20/20 + flow5 16/16 + reg 9/9 全绿，全站截图零报错**。

---

## 1. 本轮规则变更（用户原话要点）

| # | 要求 | 落地 |
|---|---|---|
| 1 | 不要报价，只提供订单交流区，自由接取 | 删除 addQuote/selectQuote 与报价 UI；新增 `orderMessages` / `sendOrderMessage`（taskId 有值、toId 为空 = 公开交流） |
| 2 | 发布先选类型；代取类要填商品价格 + 凭证 | `CATEGORIES[].needItemPrice`；publish 页类型前置，代取类强制 itemPrice + proof |
| 3 | 商品价格 ≤ 200，订单单价 ≤ 200 | `BUDGET_MAX` / `ITEM_PRICE_MAX`，前后端双校验 |
| 4 | 接单缴押金，50-200，不低于订单价，被客诉扣除，低于 50 需补交 | `requiredDeposit(budget)=min(200,max(50,budget))`；`takeTask` 冻结、`acceptDeliverable` 返还、`resolveDispute` 扣 50% |
| 5 | 建一个仓库存注册信息，更新后仍能登录 | `src/utils/vault.js`，独立 key `campus_commission_accounts_v1`，带版本迁移 |
| 6 | 学号选填，未填只能浏览，点接取/发布提示并给按钮 | `needStudentId()` / `tradeBlockReason()`；detail 按钮变「请先完成学号填写」，publish 弹窗引导 `mine?fill=1` |
| 7 | 学号唯一，填写需手机验证 | `fillStudentId({studentId, phone, code})`，手机号须与注册一致，验证码演示固定 123456 |

## 2. 已确认的关键决策（不要再推翻）

| 决策项 | 结论 |
|---|---|
| 形态 | 只做网页版（H5） |
| 后端 | 本地存储 + 独立账号仓库（云服务开通曾被用户取消，走本地实现） |
| 接单机制 | **自由接单**，无报价、无竞价、先接先得 |
| 资金 | 报酬线下结算；**押金为模拟记账**，不对接真实支付 |
| 角色 | 学生 / 管理员 |
| 上架 | 发布即上架（违规词前置拦截，管理员可下架） |

---

## 3. 环境与运行

```
Node:   C:/Users/HASEE/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe
Python: C:/Users/HASEE/.workbuddy-ai/binaries/python/versions/3.13.12/python.exe
项目:   C:/Users/HASEE/WorkBuddy AI/2026-10-27-19-04-40/campus-commission
```

```bash
# 启动 H5（必须后台跑，别加 | head）
node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js
# 端口 5180
```

### 验证脚本

| 脚本 | 内容 | 状态 |
|---|---|---|
| `scripts/flow2.js` | 接单(押金)→开工→交付→交流→验收→评价→信誉分 + 审核/用户管理 | ✅ 15/15 |
| `scripts/flow3.js` | 主页 / 换头像 / 真实选文件 / 订单管理 | ✅ 12/12 |
| `scripts/flow4.js` | 钱包流水 / 好友 / 临时聊天 10 句限制 | ✅ 20/20 |
| `scripts/flow5.js` | 学号门槛 / 押金补交与返还 / 代取类凭证 / 报酬上限 / 账号仓库 | ✅ 16/16 |
| `scripts/reg.js` | 注册校验与唯一性 | ✅ 9/9 |
| `scripts/flow6.js` | 默认信誉分 / 头像上传 / 首页一致性 / 卡通图 | ✅ 9/9 |
| `scripts/shots.js` | 全站截图 + 错误收集 | ✅ 0 错误 |

---

## 4. 数据模型

两个存储键：

| Key | 内容 |
|---|---|
| `campus_commission_state_v2` | 业务数据 |
| `campus_commission_accounts_v1` | **账号仓库**（身份/资料字段，带 version） |

```js
{
  users: [{ id, studentId, name, email, phone, password, avatar, nickname, bio,
            skills, college, credit, deposit, role, status, accepting,
            joinedAt, studentIdVerifiedAt }],
  tasks: [{ id, title, desc, category, budget, itemPrice, proof: [{name,size}],
            deadline, place, building, attachments, anonymous, urgent,
            publisherId, assigneeId, status,
            deposit, depositReturned, depositPenalty,
            audit, auditReason, createdAt, takenAt, startedAt, submittedAt, doneAt,
            deliverable: {name,note,size} }],
  messages: [{ id, taskId, fromId, toId, text, image, createdAt }],
  reviews / notifications / disputes / announcements / portfolios /
  favorites / reports / friends / ledger / categories,
  sessionUserId, seq
}
```

**消息两种形态**：`taskId` 有值 + `toId` 为空 = 订单交流区（公开）；`taskId` 为空 + `toId` 有值 = 私聊。

### 状态机

```
pending 待接单 ──缴押金接单──▶ assigned 已接单 ──开始──▶ working 进行中
                                                          │ 提交交付
                        done 已完成 ◀──验收── submitted 待验收
未完成状态可取消 ──▶ cancelled（扣 2 分，押金返还）
```

### 押金规则

- `requiredDeposit(budget) = min(200, max(50, budget))`
- 接单：从 `user.deposit` 扣除并写入 `task.deposit`（冻结）
- 验收通过：全额退回 `user.deposit`
- 申诉成立：扣 `max(10, round(deposit*0.5))`，剩余返还，记一条 `ledger.type='penalty'`
- 押金余额不足：`takeTask` 返回 `needDeposit`，前端弹补交层，`rechargeDeposit` 后重试

---

## 5. 已踩过的坑

1. **`onLoad` + `onShow` 都跳登录 → 未处理 Promise 拒绝**
   → 统一用 `store.guardLogin()`（模块级 `redirecting` 标记只跳一次）。新页面必须用它。

2. **用 Python 脚本按行替换 store.js 时误删了 `loginByCode`**
   页面报 `does not provide an export named 'loginByCode'`，表现为「连接服务器超时，点击屏幕重试」。
   → 大段替换后务必 grep 一遍导出函数是否齐全。

3. **`uni.setStorageSync` 在 localStorage 里包了一层 `{type,data}`**
   直读 `JSON.parse` 后要取 `.data`。

4. **`uni-input` 不是原生 input**，Playwright 要选 `.dm-input input`，不能直接 fill 组件根节点。

5. **`getByText(x, {exact:true})` 打不中带角标的 tab**（innerText 变成「委托审核3」）→ 用非 exact。

6. **文案改名后旧断言会挂**：详情页标题从「委托详情」改成「订单详情」、头像弹层「发消息」改成「私聊」、tab 去掉「我的报价」——测试要同步改。

7. **组件相对路径别写错**：`src/components/TaskCard.vue` 引同目录 Avatar 要用 `./Avatar.vue`，
   写成 `../../components/Avatar.vue` 会让整个页面 500，表现同样是「连接服务器超时」。
8. **头像改存 base64 后，所有渲染头像的地方都要换成 `Avatar` 组件**，
   否则会把整段 base64 当文本渲染出来。已全站替换（含 TaskCard / room / chat / admin / detail / profile / mine）。
9. **重置业务数据不能清账号**：`resetAll()` 会保留 `state.users`，并把 `persist()` 里写仓库的逻辑保留。

---

## 6. 下一步

### 6.1 接真实后端（想做真多人时）

1. 重新 `activate` 云服务（`appType: "web"`），拿 `publicConfig`
2. 建表：users / tasks / messages / reviews / notifications / disputes / friends / ledger，全部 RLS + `owner_id`
3. `store.js` 改 async，页面加 await 与 loading
4. 押金改成真实支付/存管，账号仓库换成服务端用户表
5. 订单交流区改轮询

页面基本不用改，业务逻辑都在 `store.js`。

### 6.2 体验优化

1. 凭证/附件真实上传（现在只存文件名与大小）
2. 押金流水单独列表（现在混在钱包流水里）
3. 订单超时提醒
4. 申诉时上传证据

---

## 7. 交接清单

| 项目 | 状态 |
|---|---|
| 12 个页面 | ✅ |
| 自定义头像（emoji / 相册 / 文件上传） | ✅ |
| 注册默认信誉分 100 | ✅ |
| 首页与个人主页数据一致 + 卡通插图 | ✅ |
| 自由接单（无报价） | ✅ |
| 订单类型 + 代取类商品价格/凭证 | ✅ |
| 报酬与商品价格双 200 上限 | ✅ |
| 押金缴纳/冻结/返还/扣罚/补交 | ✅ |
| 订单交流区（公开留言） | ✅ |
| 学号选填 + 门槛 + 唯一 + 手机验证 | ✅ |
| 账号仓库（独立存储 + 版本迁移） | ✅ |
| 好友 / 临时聊天 10 句 / 私聊 | ✅ |
| 钱包流水 | ✅ |
| 管理后台 7 模块 | ✅ |
| 自动化验证 | ✅ 72 项全绿 |
| 单文件版 / 提交包 | ✅ |
| 真实后端 / 真实支付 | ❌ 未做 |
