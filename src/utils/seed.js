// 初始演示数据 —— 首次进入时写入本地存储
import { CATEGORIES } from './constants.js'

const H = 3600 * 1000
const M = 60 * 1000
const D = 24 * H
const now = Date.now()

export const seedUsers = [
  {
    id: 'u1',
    studentId: '2023010101',
    name: '林小满',
    username: '林小满',
    email: 'linxiaoman@campus.edu.cn',
    phone: '13800000001',
    password: '123456',
    avatar: '🐰',
    nickname: '小满',
    bio: '视觉传达在读，PPT 和海报都能做，拍照修图也可以。',
    skills: ['PPT', '海报', '修图'],
    college: '视觉传达 · 大二',
    credit: 92,
    deposit: 0,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 120 * D
  },
  {
    id: 'u2',
    studentId: '2022010202',
    name: '陈子昂',
    username: '陈子昂',
    email: 'chenziang@campus.edu.cn',
    phone: '13800000002',
    password: '123456',
    avatar: '🐻',
    nickname: '子昂',
    bio: '计算机大三，修电脑、写脚本、整理数据都行。',
    skills: ['修电脑', '写代码', '数据整理'],
    college: '计算机科学 · 大三',
    credit: 86,
    deposit: 60,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 90 * D
  },
  {
    id: 'u3',
    studentId: '2024010303',
    name: '苏晴',
    username: '苏晴',
    email: 'suqing@campus.edu.cn',
    phone: '13800000003',
    password: '123456',
    avatar: '🐱',
    nickname: '晴晴',
    bio: '英语专业，翻译、文案、四六级辅导都可以找我。',
    skills: ['翻译', '文案', '英语辅导'],
    college: '英语 · 大一',
    credit: 78,
    deposit: 0,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 30 * D
  },
  {
    id: 'u4',
    studentId: '2021010404',
    name: '周野',
    username: '周野',
    email: 'zhouye@campus.edu.cn',
    phone: '13800000004',
    password: '123456',
    avatar: '🦊',
    nickname: '野哥',
    bio: '体育教育大四，跑腿搬东西最快，篮球陪练也行。',
    skills: ['跑腿', '搬东西', '篮球'],
    college: '体育教育 · 大四',
    credit: 95,
    deposit: 120,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 300 * D
  },
  {
    id: 'u5',
    studentId: '2023020505',
    name: '何知微',
    username: '何知微',
    email: 'hezhiwei@campus.edu.cn',
    phone: '13800000005',
    password: '123456',
    avatar: '🐼',
    nickname: '知微',
    bio: '数学系研究生，高数线代概率都能带，论文排版也熟。',
    skills: ['高数辅导', '论文排版', '数据整理'],
    college: '应用数学 · 研一',
    credit: 88,
    deposit: 80,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 200 * D
  },
  {
    id: 'u6',
    studentId: '',
    name: '许一帆',
    username: '许一帆',
    email: 'xuyifan@campus.edu.cn',
    phone: '13800000006',
    password: '123456',
    avatar: '🐧',
    nickname: '一帆',
    bio: '刚注册，还没填学号，先逛逛。',
    skills: [],
    college: '机械工程 · 大一',
    credit: 100,
    deposit: 0,
    role: 'user',
    status: 'active',
    accepting: true,
    joinedAt: now - 2 * H
  },
  {
    id: 'a1',
    studentId: 'admin',
    name: '张老师',
    username: '张老师',
    email: 'zhang@campus.edu.cn',
    phone: '13800000000',
    password: 'admin888',
    avatar: '🧑‍🏫',
    nickname: '平台管理员',
    bio: '校园委托平台管理员，负责审核与纠纷处理。',
    skills: [],
    college: '学生工作处',
    credit: 100,
    deposit: 0,
    role: 'admin',
    status: 'active',
    accepting: false,
    joinedAt: now - 400 * D
  }
]

const proofOrder = { name: '订单截图.jpg', size: '248 KB' }

export const seedTasks = [
  {
    id: 't1',
    title: '帮买一杯奶茶送到松园 3 号楼',
    desc: '一食堂二楼那家，四季春玛奇朵，少冰三分糖，送到松园 3 号楼楼下就行。',
    category: 'errand',
    budget: 8,
    itemPrice: 18,
    proof: [proofOrder],
    deadline: now + 5 * H,
    place: '一食堂二楼',
    building: 'song',
    attachments: [],
    anonymous: false,
    urgent: true,
    publisherId: 'u2',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 40 * M
  },
  {
    id: 't2',
    title: '课程结课 PPT 美化，20 页左右',
    desc: '内容是做好的，只是排版比较丑。需要统一配色、加图示、做成能直接讲的版本，风格简洁商务一点。',
    category: 'doc',
    budget: 60,
    itemPrice: 0,
    proof: [],
    deadline: now + 2 * D,
    place: '图书馆三楼自习区',
    building: 'lib',
    attachments: [{ name: '结课汇报-初稿.pptx', size: '4.2 MB' }],
    anonymous: false,
    urgent: false,
    publisherId: 'u3',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 3 * H
  },
  {
    id: 't3',
    title: '高数期中救命，第三章到第五章',
    desc: '主要是多元函数微分和重积分，概念能听懂但题不会做。希望带着过一遍题型，最好能留几道练习。',
    category: 'study',
    budget: 80,
    itemPrice: 0,
    proof: [],
    deadline: now + 1 * D,
    place: '图书馆 4 楼讨论间',
    building: 'lib',
    attachments: [],
    anonymous: false,
    urgent: true,
    publisherId: 'u1',
    assigneeId: 'u5',
    status: 'working',
    deposit: 80,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 8 * H,
    takenAt: now - 6 * H
  },
  {
    id: 't4',
    title: '毕业照跟拍，竹园到图书馆一路',
    desc: '想拍一组生活化的毕业照，不用太正式，会提供相机更好，没有的话手机也行，主要要会抓拍。',
    category: 'photo',
    budget: 150,
    itemPrice: 0,
    proof: [],
    deadline: now + 3 * D,
    place: '竹园宿舍门口集合',
    building: 'zhu',
    attachments: [],
    anonymous: false,
    urgent: false,
    publisherId: 'u4',
    assigneeId: 'u1',
    status: 'submitted',
    deposit: 150,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 2 * D,
    takenAt: now - 1 * D,
    submittedAt: now - 3 * H,
    deliverable: { name: '毕业照-精修 32 张.zip', note: '挑了 32 张精修，原片也一起打包了', size: '86 MB' }
  },
  {
    id: 't5',
    title: '帮忙打印装订一份课程报告',
    desc: 'PDF 已排好版，A4 双面，一共 28 页，需要胶装。文件我发你，费用另算。',
    category: 'other',
    budget: 15,
    itemPrice: 0,
    proof: [],
    deadline: now + 6 * H,
    place: '教学楼 A 座一楼打印店',
    building: 'teach',
    attachments: [{ name: '课程报告-终稿.pdf', size: '2.8 MB' }],
    anonymous: true,
    urgent: false,
    publisherId: 'u5',
    assigneeId: 'u2',
    status: 'assigned',
    deposit: 50,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 2 * H,
    takenAt: now - 1 * H
  },
  {
    id: 't6',
    title: '英语四级作文批改，两篇',
    desc: '写了两篇真题作文，想要有人帮忙看看语法和结构，最好能给修改建议。',
    category: 'study',
    budget: 30,
    itemPrice: 0,
    proof: [],
    deadline: now - 1 * D,
    place: '线上即可',
    building: 'lib',
    attachments: [{ name: '四级作文两篇.docx', size: '36 KB' }],
    anonymous: false,
    urgent: false,
    publisherId: 'u2',
    assigneeId: 'u3',
    status: 'done',
    deposit: 50,
    depositReturned: true,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 5 * D,
    takenAt: now - 5 * D + H,
    submittedAt: now - 4 * D,
    doneAt: now - 3 * D,
    deliverable: { name: '作文批注版.docx', note: '逐句批注了，另外附了一份常用句型', size: '1.2 MB' }
  },
  {
    id: 't7',
    title: '宿舍搬两个行李箱到兰园 2 楼',
    desc: '换宿舍，两个 24 寸箱子，没有电梯。十分钟的事，谢啦。',
    category: 'other',
    budget: 20,
    itemPrice: 0,
    proof: [],
    deadline: now - 2 * D,
    place: '梅园 5 号楼 → 兰园 2 号楼',
    building: 'mei',
    attachments: [],
    anonymous: false,
    urgent: false,
    publisherId: 'u3',
    assigneeId: 'u4',
    status: 'done',
    deposit: 50,
    depositReturned: true,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 4 * D,
    takenAt: now - 4 * D + 2 * H,
    submittedAt: now - 3 * D,
    doneAt: now - 2 * D,
    deliverable: { name: '已搬完', note: '两个箱子都送到 2 楼门口了', size: '' }
  },
  {
    id: 't8',
    title: '求一位会剪视频的同学，社团招新用',
    desc: '素材已经拍好了，大概 40 分钟，想剪成 2 分钟的招新短片，加点字幕和转场就行。',
    category: 'other',
    budget: 100,
    itemPrice: 0,
    proof: [],
    deadline: now + 4 * D,
    place: '线上交付即可',
    building: 'teach',
    attachments: [{ name: '招新素材.zip', size: '860 MB' }],
    anonymous: false,
    urgent: false,
    publisherId: 'u4',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 6 * H
  },
  {
    id: 't9',
    title: '帮忙带一份一食堂的黄焖鸡回松园',
    desc: '不要香菜，多加饭。送到松园 3 号楼 402，饭钱另付。',
    category: 'errand',
    budget: 6,
    itemPrice: 16,
    proof: [proofOrder],
    deadline: now + 2 * H,
    place: '一食堂二楼',
    building: 'song',
    attachments: [],
    anonymous: false,
    urgent: false,
    publisherId: 'u2',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 15 * M
  },
  {
    id: 't10',
    title: '求代考高数期末，价格好商量',
    desc: '下周高数期末，希望有人能替我进考场，价格可以谈。',
    category: 'study',
    budget: 200,
    itemPrice: 0,
    proof: [],
    deadline: now + 5 * D,
    place: '教学楼 B 座',
    building: 'teach',
    attachments: [],
    anonymous: true,
    urgent: false,
    publisherId: 'u3',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 20 * M
  },
  {
    id: 't11',
    title: '帮写一份社会实践报告',
    desc: '需要一份 3000 字的社会实践报告，内容随便编就行。',
    category: 'doc',
    budget: 40,
    itemPrice: 0,
    proof: [],
    deadline: now + 3 * D,
    place: '线上',
    building: 'lib',
    attachments: [],
    anonymous: false,
    urgent: false,
    publisherId: 'u2',
    assigneeId: '',
    status: 'pending',
    deposit: 0,
    audit: 'rejected',
    auditReason: '代写作业属于平台禁止行为，请自行完成。',
    createdAt: now - 1 * D
  },
  {
    id: 't12',
    title: '社团招新海报设计，两版',
    desc: '需要两版风格不同的招新海报，一版活力撞色、一版极简黑白，尺寸 A3，要能直接打印。',
    category: 'doc',
    budget: 45,
    itemPrice: 0,
    proof: [],
    deadline: now - 6 * D,
    place: '线上交付',
    building: 'teach',
    attachments: [{ name: '社团 LOGO.png', size: '128 KB' }],
    anonymous: false,
    urgent: false,
    publisherId: 'u2',
    assigneeId: 'u1',
    status: 'done',
    deposit: 50,
    depositReturned: true,
    audit: 'approved',
    auditReason: '',
    createdAt: now - 9 * D,
    takenAt: now - 8 * D,
    submittedAt: now - 7 * D,
    doneAt: now - 6 * D,
    deliverable: { name: '招新海报-两版.zip', note: '两版都出了 300dpi 的印刷版', size: '18.4 MB' }
  }
]

// 订单交流区：taskId 有值、toId 为空 → 公开交流；taskId 为空、toId 有值 → 私聊
export const seedMessages = [
  { id: 'm1', taskId: 't3', fromId: 'u5', toId: '', text: '第三章到第五章我可以带，主要讲题型套路。', image: '', createdAt: now - 7 * H },
  { id: 'm2', taskId: 't3', fromId: 'u1', toId: '', text: '太好了！我主要是重积分那块完全不会。', image: '', createdAt: now - 6 * H - 30 * M },
  { id: 'm3', taskId: 't3', fromId: 'u4', toId: '', text: '如果还需要人搭把手，我也可以帮忙占座。', image: '', createdAt: now - 6 * H - 10 * M },
  { id: 'm4', taskId: 't3', fromId: 'u5', toId: '', text: '明天下午两点图书馆 4 楼讨论间，我带上整理的题型笔记。', image: '', createdAt: now - 6 * H },
  { id: 'm5', taskId: 't1', fromId: 'u4', toId: '', text: '这家奶茶我常买，出餐挺快的，二十分钟能送到。', image: '', createdAt: now - 30 * M },
  { id: 'm6', taskId: 't4', fromId: 'u1', toId: '', text: '照片都修完了，原片和精修一起打包了，你看下有没有要调的。', image: '', createdAt: now - 3 * H },
  { id: 'm7', taskId: '', fromId: 'u5', toId: 'u1', text: '你上次问的排版问题，我整理了一份模板，回头发你。', image: '', createdAt: now - 2 * D },
  { id: 'm8', taskId: '', fromId: 'u1', toId: 'u5', text: '太好了，正好这次海报要用，谢啦！', image: '', createdAt: now - 2 * D + 10 * M }
]

export const seedReviews = [
  {
    id: 'r1',
    taskId: 't6',
    fromId: 'u2',
    toId: 'u3',
    stars: 5,
    tags: ['沟通顺畅', '准时守信', '做事细致'],
    text: '批改得很细，连标点问题都标出来了，还额外给了句型模板，值。',
    createdAt: now - 3 * D
  },
  {
    id: 'r2',
    taskId: 't6',
    fromId: 'u3',
    toId: 'u2',
    stars: 5,
    tags: ['沟通顺畅', '态度友善'],
    text: '委托人很配合，需求说得很清楚，改起来很顺。',
    createdAt: now - 3 * D
  },
  {
    id: 'r3',
    taskId: 't7',
    fromId: 'u3',
    toId: 'u4',
    stars: 5,
    tags: ['准时守信', '做事细致'],
    text: '两个箱子一口气搬上二楼，快得离谱，人也很好说话。',
    createdAt: now - 2 * D
  },
  {
    id: 'r4',
    taskId: 't7',
    fromId: 'u4',
    toId: 'u3',
    stars: 4,
    tags: ['沟通顺畅'],
    text: '地址说得很清楚，见面也准时。',
    createdAt: now - 2 * D
  },
  {
    id: 'r5',
    taskId: 't12',
    fromId: 'u2',
    toId: 'u1',
    stars: 5,
    tags: ['沟通顺畅', '做事细致', '超出预期'],
    text: '两版风格差别很大，都挺好看，最后打印出来社团那边很满意。',
    createdAt: now - 6 * D
  },
  {
    id: 'r6',
    taskId: 't12',
    fromId: 'u1',
    toId: 'u2',
    stars: 5,
    tags: ['沟通顺畅', '态度友善'],
    text: '需求给得很明确，改稿也痛快。',
    createdAt: now - 6 * D
  }
]

export const seedNotifications = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'take',
    title: '有人接取了你的订单',
    body: '何知微 接取了「高数期中救命，第三章到第五章」',
    taskId: 't3',
    read: false,
    createdAt: now - 6 * H
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'deliver',
    title: '服务商已交付，等待你验收',
    body: '周野 提交了「毕业照跟拍」的交付成果',
    taskId: 't4',
    read: false,
    createdAt: now - 3 * H
  },
  {
    id: 'n3',
    userId: 'u1',
    type: 'system',
    title: '平台公告',
    body: '期末周期间，代取代买类订单请在 22:00 前完成交付。',
    taskId: '',
    read: true,
    createdAt: now - 1 * D
  }
]

export const seedDisputes = [
  {
    id: 'd1',
    taskId: 't7',
    fromId: 'u3',
    reason: '约定晚上 8 点前搬完，实际拖到第二天上午，影响了我入住。',
    status: 'resolved',
    reply: '经核实服务商确实延迟交付，已从其押金中扣除 25 元，并向委托人致歉。',
    penalty: 25,
    createdAt: now - 3 * D,
    resolvedAt: now - 2 * D
  }
]

export const seedAnnouncements = [
  {
    id: 'an1',
    title: '关于禁止代写代考类委托的公告',
    body: '近期发现个别同学发布代考、代写论文类委托。平台已全部驳回并记录，累计两次将直接封号。请同学们自觉遵守校规。',
    createdAt: now - 2 * D
  },
  {
    id: 'an2',
    title: '接单押金规则上线',
    body: '为保障订单安全，接单需缴纳 50-200 元押金，且不低于订单报酬。订单验收通过后全额返还，被客诉且申诉成立的按情节扣除。',
    createdAt: now - 1 * D
  }
]

export const seedPortfolios = [
  {
    id: 'p1',
    userId: 'u1',
    title: '课程结课汇报 PPT（20 页）',
    desc: '简洁商务风，统一配色 + 图示化改造，被老师当范例讲。',
    link: '作品集/结课汇报.pptx',
    createdAt: now - 20 * D
  },
  {
    id: 'p2',
    userId: 'u1',
    title: '社团招新海报三版',
    desc: '三种风格：活力撞色、极简黑白、手绘插画。',
    link: '作品集/招新海报.pdf',
    createdAt: now - 12 * D
  },
  {
    id: 'p3',
    userId: 'u5',
    title: '高数期末题型梳理讲义',
    desc: '按题型分类整理，配 30 道典型例题，带过两届学生。',
    link: '作品集/高数讲义.pdf',
    createdAt: now - 40 * D
  },
  {
    id: 'p4',
    userId: 'u4',
    title: '毕业照跟拍 3 组',
    desc: '生活化抓拍风格，会带相机和反光板。',
    link: '作品集/毕业照精选.zip',
    createdAt: now - 8 * D
  }
]

export const seedFavorites = [
  { id: 'f1', userId: 'u1', taskId: 't2', createdAt: now - 2 * H },
  { id: 'f2', userId: 'u1', providerId: 'u5', createdAt: now - 1 * D }
]

// 好友关系：pending 待对方同意，accepted 已互为好友
export const seedFriends = [
  { id: 'fr1', aId: 'u1', bId: 'u5', status: 'accepted', requesterId: 'u1', createdAt: now - 30 * D },
  { id: 'fr2', aId: 'u3', bId: 'u4', status: 'accepted', requesterId: 'u4', createdAt: now - 20 * D },
  { id: 'fr3', aId: 'u1', bId: 'u2', status: 'pending', requesterId: 'u2', createdAt: now - 5 * H }
]

// 钱包流水：订单验收通过时写入，委托人记支出、服务商记收入
export const seedLedger = [
  { id: 'lg1', userId: 'u1', taskId: 't12', type: 'income', amount: 45, title: '社团招新海报设计，两版', createdAt: now - 6 * D },
  { id: 'lg2', userId: 'u2', taskId: 't12', type: 'expense', amount: 45, title: '社团招新海报设计，两版', createdAt: now - 6 * D },
  { id: 'lg3', userId: 'u3', taskId: 't6', type: 'income', amount: 30, title: '英语四级作文批改，两篇', createdAt: now - 3 * D },
  { id: 'lg4', userId: 'u2', taskId: 't6', type: 'expense', amount: 30, title: '英语四级作文批改，两篇', createdAt: now - 3 * D },
  { id: 'lg5', userId: 'u4', taskId: 't7', type: 'income', amount: 20, title: '宿舍搬两个行李箱到兰园 2 楼', createdAt: now - 2 * D },
  { id: 'lg6', userId: 'u3', taskId: 't7', type: 'expense', amount: 20, title: '宿舍搬两个行李箱到兰园 2 楼', createdAt: now - 2 * D }
]

export const seedReports = []

export function seedState() {
  return {
    users: JSON.parse(JSON.stringify(seedUsers)),
    tasks: JSON.parse(JSON.stringify(seedTasks)),
    messages: JSON.parse(JSON.stringify(seedMessages)),
    reviews: JSON.parse(JSON.stringify(seedReviews)),
    notifications: JSON.parse(JSON.stringify(seedNotifications)),
    disputes: JSON.parse(JSON.stringify(seedDisputes)),
    announcements: JSON.parse(JSON.stringify(seedAnnouncements)),
    portfolios: JSON.parse(JSON.stringify(seedPortfolios)),
    favorites: JSON.parse(JSON.stringify(seedFavorites)),
    reports: JSON.parse(JSON.stringify(seedReports)),
    friends: JSON.parse(JSON.stringify(seedFriends)),
    ledger: JSON.parse(JSON.stringify(seedLedger)),
    categories: JSON.parse(JSON.stringify(CATEGORIES)),
    sessionUserId: '',
    seq: 2000
  }
}
