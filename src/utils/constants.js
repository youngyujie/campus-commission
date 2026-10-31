// 分类 / 状态 / 信用 / 校区楼栋 —— 全站共享的元信息

// needItemPrice：该类型需要填写商品价格并提供凭证（代取/代买类）
export const CATEGORIES = [
  { key: 'errand', name: '代取代买', emoji: '🛵', color: '#FF8A3D', soft: '#FFF2E8', needItemPrice: true },
  { key: 'doc', name: '文档制作', emoji: '📄', color: '#7C5CFF', soft: '#F2EEFF', needItemPrice: false },
  { key: 'study', name: '学习辅导', emoji: '📚', color: '#4C6FFF', soft: '#EEF1FF', needItemPrice: false },
  { key: 'photo', name: '拍照拍摄', emoji: '📷', color: '#FF6B9A', soft: '#FFEDF3', needItemPrice: false },
  { key: 'other', name: '其他', emoji: '✨', color: '#21C7A8', soft: '#E6FAF6', needItemPrice: false }
]

// 平台只做小额订单
export const BUDGET_MAX = 200
export const ITEM_PRICE_MAX = 200

// 押金规则
export const DEPOSIT_MIN = 50
export const DEPOSIT_MAX = 200

// 接单需要缴纳的押金：不低于 50，且不低于订单价，上限 200
export function requiredDeposit(budget) {
  const b = Number(budget) || 0
  return Math.min(DEPOSIT_MAX, Math.max(DEPOSIT_MIN, b))
}

export function categoryOf(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

// 订单状态机：
// pending 待接单 → assigned 已接单 → working 进行中 → submitted 待验收 → done 已完成
// 未完成状态可取消 → cancelled
export const STATUS = {
  pending: { name: '待接单', color: '#FF8A3D', soft: '#FFF2E8', step: 1 },
  assigned: { name: '已接单', color: '#4C6FFF', soft: '#EEF1FF', step: 2 },
  working: { name: '进行中', color: '#4C6FFF', soft: '#EEF1FF', step: 2 },
  submitted: { name: '待验收', color: '#7C5CFF', soft: '#F2EEFF', step: 3 },
  done: { name: '已完成', color: '#21C7A8', soft: '#E6FAF6', step: 4 },
  cancelled: { name: '已取消', color: '#9AA0B4', soft: '#F1F2F6', step: 0 }
}

export function statusOf(key) {
  return STATUS[key] || STATUS.pending
}

export const STEPS = [
  { key: 'pending', label: '发布' },
  { key: 'assigned', label: '接单' },
  { key: 'submitted', label: '待验收' },
  { key: 'done', label: '完成' }
]

// 委托审核状态（管理员先审后上架）
export const AUDIT = {
  pending: { name: '待审核', color: '#FF8A3D', soft: '#FFF2E8' },
  approved: { name: '已通过', color: '#21C7A8', soft: '#E6FAF6' },
  rejected: { name: '已驳回', color: '#F04A4A', soft: '#FCEBEB' }
}

export function auditOf(key) {
  return AUDIT[key] || AUDIT.pending
}

// 申诉处理状态
export const DISPUTE_STATUS = {
  open: { name: '待处理', color: '#FF8A3D', soft: '#FFF2E8' },
  resolved: { name: '已处理', color: '#21C7A8', soft: '#E6FAF6' },
  rejected: { name: '已驳回', color: '#9AA0B4', soft: '#F1F2F6' }
}

// 信誉分 → 等级
export function creditLevel(credit) {
  if (credit >= 95) return { name: '校园之星', color: '#FF8A3D', emoji: '👑' }
  if (credit >= 85) return { name: '值得信赖', color: '#21C7A8', emoji: '🌟' }
  if (credit >= 70) return { name: '靠谱同学', color: '#4C6FFF', emoji: '✅' }
  if (credit >= 60) return { name: '成长中', color: '#7C5CFF', emoji: '🌱' }
  return { name: '新同学', color: '#9AA0B4', emoji: '🆕' }
}

// 信誉分低于此值限制发单与接单
export const CREDIT_MIN_TO_TRADE = 60

export const REVIEW_TAGS = ['沟通顺畅', '准时守信', '做事细致', '态度友善', '超出预期', '有待改进']

// 技能标签：现成可选，也可自定义；单个标签最多 4 个字，最多选 8 个
export const SKILL_TAG_MAX_LEN = 4
export const SKILL_TAG_MAX_COUNT = 8

export const SKILL_TAGS = [
  '取快递',
  '带饭',
  '跑腿',
  '代买',
  '打印',
  '搬东西',
  '占座',
  '排队',
  '修电脑',
  '装系统',
  '写代码',
  '数据整理',
  'PPT',
  'Word',
  'Excel',
  '排版',
  '海报',
  '修图',
  '拍照',
  '视频剪辑',
  '文案',
  '翻译',
  '高数辅导',
  '英语辅导',
  '编程辅导',
  '论文排版',
  '吉他',
  '篮球',
  '羽毛球',
  '书法'
]

// 校区地点（按学校立体图整理）：校门、学生公寓、教学楼、实训楼、食堂、场馆等
export const BUILDINGS = [
  { key: 'gate1', name: '1号门（学校进出口）', short: '1号门' },
  { key: 'gate2', name: '2号门（停车场）', short: '2号门' },
  { key: 'gate3', name: '3号门（学校进出口）', short: '3号门' },
  { key: 'gate4', name: '4号门（学校出口）', short: '4号门' },
  { key: 'gate5', name: '5号门（学校出口）', short: '5号门' },
  { key: 'apt1', name: '1号学生公寓', short: '1号公寓' },
  { key: 'apt16', name: '1-6号学生公寓', short: '1-6号公寓' },
  { key: 'apt8', name: '8号学生公寓', short: '8号公寓' },
  { key: 'apt9', name: '9号学生公寓', short: '9号公寓' },
  { key: 'teach', name: '教学楼', short: '教学楼' },
  { key: 'train1', name: '第一实训楼', short: '第一实训楼' },
  { key: 'train2', name: '第二实训楼', short: '第二实训楼' },
  { key: 'office', name: '办公楼', short: '办公楼' },
  { key: 'art', name: '艺术大楼（报到地点）', short: '艺术大楼' },
  { key: 'canteen1', name: '第一学生食堂', short: '第一食堂' },
  { key: 'restaurant', name: '两江餐厅', short: '两江餐厅' },
  { key: 'sports', name: '运动场', short: '运动场' },
  { key: 'rose', name: '玫瑰花苑', short: '玫瑰花苑' },
  { key: 'book', name: '玫瑰书苑', short: '玫瑰书苑' },
  { key: 'lake', name: '恋湖', short: '恋湖' },
  { key: 'kangqiao', name: '康桥', short: '康桥' },
  { key: 'plaza', name: '月光音乐广场', short: '音乐广场' },
  { key: 'parking', name: '停车场', short: '停车场' }
]

// 旧版虚构楼栋 → 新校区地点（兼容历史数据，不用清库也能显示新地址）
const OLD_BUILDING_MAP = {
  song: 'apt16',
  zhu: 'apt8',
  mei: 'apt9',
  lan: 'apt1',
  teach: 'teach',
  lib: 'teach',
  gym: 'sports'
}

export function buildingOf(key) {
  const k = OLD_BUILDING_MAP[key] || key
  return BUILDINGS.find((b) => b.key === k) || BUILDINGS[0]
}

// 旧地名 → 学校立体图地点（按词替换，保留“二楼 / 门口集合 / A座”等上下文）
const PLACE_WORD_MAP = [
  ['松园 3 号楼', '1-6号学生公寓3栋', 'apt16'],
  ['松园3号楼', '1-6号学生公寓3栋', 'apt16'],
  ['松园宿舍', '1-6号学生公寓', 'apt16'],
  ['竹园宿舍', '8号学生公寓', 'apt8'],
  ['梅园宿舍', '9号学生公寓', 'apt9'],
  ['兰园宿舍', '1号学生公寓', 'apt1'],
  ['松园', '1-6号学生公寓', 'apt16'],
  ['竹园', '8号学生公寓', 'apt8'],
  ['梅园', '9号学生公寓', 'apt9'],
  ['兰园', '1号学生公寓', 'apt1'],
  ['一食堂', '第一学生食堂', 'canteen1'],
  ['图书馆', '教学楼', 'teach'],
  ['菜鸟驿站（东门）', '1号门', 'gate1'],
  ['体育馆', '运动场', 'sports']
]

// 把旧地址翻译成学校地点（保留上下文），并推断所属楼栋
export function normalizeLocation(place, building) {
  let p = String(place || '')
  let b = OLD_BUILDING_MAP[building] || building
  let matched = false
  PLACE_WORD_MAP.forEach(([word, to, key]) => {
    if (p.indexOf(word) >= 0) {
      if (!matched) {
        b = key
        matched = true
      }
      p = p.split(word).join(to)
    }
  })
  // 已经是新地点名的，反推楼栋
  if (!matched) {
    const hit = BUILDINGS.find((x) => p.indexOf(x.short) >= 0 || p.indexOf(x.name) >= 0)
    if (hit) b = hit.key
  }
  return { place: p, building: b }
}

// 标题/描述里的旧地名也顺手换成学校地点，让演示内容整体一致
export function localizePlaceText(text) {
  let out = String(text || '')
  PLACE_WORD_MAP.forEach(([word, to]) => {
    out = out.split(word).join(to)
  })
  return out
}

// 平台禁止发布的违规词（发单时系统直接检测，命中即拦截）
// 只收录「明确违规」的学术作弊 / 刷单类词，避免误伤正常的文档制作委托
export const BANNED_KEYWORDS = [
  '代考', '替考', '代写论文', '论文代写', '代刷课', '刷课',
  '代写作业', '作业代写', '代课', '替课', '代签到', '考试答案',
  '枪手', '刷单', '代体测', '代体检', '代测', '替跑', '小抄',
  '作弊', '包过', '代刷网课', '刷网课', '代刷单'
]

// ==================== 称号系统 ====================
// 所有同学默认「校园之初」；满足条件后额外解锁「校园之星」「校园之誉」，
// 已解锁的称号可自由切换（在称号详情页操作）。
export const TITLES = [
  {
    key: 'chu',
    name: '校园之初',
    emoji: '🌱',
    color: '#64748B',
    soft: '#F1F5F9',
    desc: '每位同学都有的起点称号',
    path: '注册并完成学生认证后默认获得'
  },
  {
    key: 'zhi',
    name: '校园之星',
    emoji: '⭐',
    color: '#FF8A3D',
    soft: '#FFF2E8',
    desc: '乐于助人，认真完成每一份委托',
    path: '信誉分 ≥ 95，且成功完成他人 10 条委托'
  },
  {
    key: 'yu',
    name: '校园之誉',
    emoji: '🏅',
    color: '#4C6FFF',
    soft: '#EEF1FF',
    desc: '发布的委托靠谱，广受同学认可',
    path: '信誉分 ≥ 95，且成功发布 10 条委托并被他人完成'
  }
]

export function titleOf(key) {
  return TITLES.find((t) => t.key === key) || TITLES[0]
}

export const RULES = [
  {
    title: '仅限本校学生使用',
    items: [
      '注册需填写真实学号、姓名与校园邮箱，三者需匹配',
      '账号仅限本人使用，不得转借、出租或买卖',
      '冒用他人身份注册的，一经查实直接封号'
    ]
  },
  {
    title: '严禁发布以下委托（审核直接驳回）',
    items: [
      '代考、替考、考试答案、代签到、代课',
      '论文代写、作业代写、代刷课、刷网课进度',
      '任何违反校规校纪或法律法规的需求',
      '涉及人身安全、违禁物品、借贷与代收款项'
    ]
  },
  {
    title: '小额订单与押金规则',
    items: [
      '平台只做小额互助：单笔订单报酬上限 200 元，商品价格上限 200 元',
      '接单需先缴纳押金，押金最低 50 元、最高 200 元，且不得低于订单报酬',
      '押金在订单验收通过后全额返还；押金不足时需先补交才能接单',
      '被客诉且申诉成立，会按情节从押金中扣除，剩余部分返还',
      '代取代买类订单必须填写商品价格并上传凭证（订单截图 / 小票）'
    ]
  },
  {
    title: '报酬与结算',
    items: [
      '平台不碰资金，报酬由双方线下自行结算（微信 / 支付宝）',
      '平台只记录订单金额与流程，用于信用与纠纷取证',
      '禁止在平台外私下加价、诱导取消订单后另行交易'
    ]
  },
  {
    title: '信誉分规则',
    items: [
      '完成一条委托并验收：双方各 +2',
      '收到 4-5 星评价：被评价方 +3；收到 1-2 星：-3',
      '发布后单方面取消：-2；超时未交付被申诉成立：-5',
      '信誉分低于 60 将被限制发单与接单'
    ]
  },
  {
    title: '纠纷处理',
    items: [
      '交付不符、逾期未交付、恶意拖延，任一方可发起申诉',
      '管理员会在 24 小时内介入仲裁，双方需提供凭证',
      '恶意申诉、虚假举报同样会扣信誉分'
    ]
  }
]

// #RRGGBB + 透明度 → rgba()，避免 8 位 hex 在小程序端兼容问题
export function tint(hex, alpha) {
  const h = String(hex || '#000000').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
