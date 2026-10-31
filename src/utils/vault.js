// 账号仓库（Account Vault）
// 与业务数据分开存放：清空订单/重置演示数据、应用更新，都不会影响已注册账号。
// 业务状态在 campus_commission_state_v2，账号在 campus_commission_accounts_v1。

const VAULT_KEY = 'campus_commission_accounts_v1'
const VAULT_VERSION = 2

// 只保留身份与资料字段，避免把业务数据混进账号仓库
const IDENTITY_FIELDS = [
  'id',
  'studentId',
  'name',
  'email',
  'phone',
  'password',
  'avatar',
  'nickname',
  'bio',
  'skills',
  'college',
  'credit',
  'deposit',
  'role',
  'status',
  'accepting',
  'joinedAt',
  'studentIdVerifiedAt'
]

function pick(user) {
  const out = {}
  IDENTITY_FIELDS.forEach((k) => {
    if (user[k] !== undefined) out[k] = user[k]
  })
  return out
}

function migrate(raw) {
  let vault = raw
  if (!vault || typeof vault !== 'object') {
    return { version: VAULT_VERSION, accounts: [], updatedAt: Date.now() }
  }
  if (!Array.isArray(vault.accounts)) vault.accounts = []
  // 历史版本迁移：v1 没有 phone / deposit 字段
  if (!vault.version || vault.version < 2) {
    vault.accounts = vault.accounts.map((a) => ({
      deposit: 0,
      studentId: '',
      phone: '',
      ...a
    }))
    vault.version = 2
  }
  vault.version = VAULT_VERSION
  return vault
}

export function readVault() {
  try {
    const raw = uni.getStorageSync(VAULT_KEY)
    if (!raw || typeof raw !== 'object') {
      return { version: VAULT_VERSION, accounts: [], updatedAt: 0 }
    }
    return migrate(raw)
  } catch (e) {
    return { version: VAULT_VERSION, accounts: [], updatedAt: 0 }
  }
}

export function writeAccounts(users) {
  try {
    const vault = {
      version: VAULT_VERSION,
      accounts: (users || []).map(pick),
      updatedAt: Date.now()
    }
    uni.setStorageSync(VAULT_KEY, vault)
    return vault
  } catch (e) {
    console.error('账号仓库写入失败', e)
    return null
  }
}

export function readAccounts() {
  return readVault().accounts || []
}

export function findAccountByStudentId(studentId) {
  const sid = String(studentId || '').trim()
  if (!sid) return null
  return readAccounts().find((a) => a.studentId === sid) || null
}

export function findAccountByPhone(phone) {
  const p = String(phone || '').trim()
  if (!p) return null
  return readAccounts().find((a) => a.phone === p) || null
}

export function vaultInfo() {
  const v = readVault()
  return {
    count: v.accounts.length,
    version: v.version,
    updatedAt: v.updatedAt,
    key: VAULT_KEY
  }
}

export { VAULT_KEY, VAULT_VERSION }
