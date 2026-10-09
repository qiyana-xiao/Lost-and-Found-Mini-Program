// utils/auth.ts 本地身份与账号体系（演示版，替代云函数 OPENID）
// 支持游客模式、注册、登录、退出登录；账号数据仅保存在本机缓存中。
// 注意：密码仅做简单哈希后本地存储，仅用于单机演示，不可用于生产环境。

const USER_KEY = 'LOSTFOUND_USER' // 当前登录身份
const ACCOUNTS_KEY = 'LOSTFOUND_ACCOUNTS' // 本机注册的账号表
const GUEST_KEY = 'LOSTFOUND_GUEST' // 设备游客身份（退出登录后回到它）

export interface LocalUser {
  uid: string
  nickname: string
  avatar: string
  username?: string // 有值表示已登录的注册账号；无值表示游客
}

interface AccountRecord {
  uid: string
  username: string
  passHash: string
  nickname: string
  avatar: string
  createdAt: number
}

const genUid = (): string =>
  'u_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)

const guestUser = (): LocalUser => ({ uid: genUid(), nickname: '微信用户', avatar: '' })

// 简单字符串哈希（djb2 变体），演示用，非加密安全
const hash = (s: string): string => {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

const readAccounts = (): Record<string, AccountRecord> => wx.getStorageSync(ACCOUNTS_KEY) || {}

const writeAccounts = (acc: Record<string, AccountRecord>): void => {
  wx.setStorageSync(ACCOUNTS_KEY, acc)
}

export const auth = {
  /** 当前身份；首次使用时创建游客身份并记住，之后退出登录会回到该游客身份 */
  getUser(): LocalUser {
    const u = wx.getStorageSync(USER_KEY) as LocalUser
    if (u && u.uid) return u
    const guest = (wx.getStorageSync(GUEST_KEY) as LocalUser) || guestUser()
    wx.setStorageSync(GUEST_KEY, guest)
    wx.setStorageSync(USER_KEY, guest)
    return guest
  },

  getUid(): string {
    return this.getUser().uid
  },

  /** 修改昵称 / 头像；若为登录账号，同步账号表 */
  updateUser(patch: Partial<Pick<LocalUser, 'nickname' | 'avatar'>>): LocalUser {
    const u = { ...this.getUser(), ...patch } as LocalUser
    wx.setStorageSync(USER_KEY, u)
    if (u.username) {
      const accounts = readAccounts()
      if (accounts[u.username]) {
        accounts[u.username] = { ...accounts[u.username], nickname: u.nickname, avatar: u.avatar }
        writeAccounts(accounts)
      }
    }
    return u
  },

  /** 是否游客身份 */
  isGuest(): boolean {
    return !this.getUser().username
  },

  /** 本机是否已有注册账号 */
  hasAccounts(): boolean {
    return Object.keys(readAccounts()).length > 0
  },

  /** 注册新账号并自动登录 */
  register(username: string, password: string, nickname?: string): { success: boolean; msg?: string } {
    const name = (username || '').trim()
    const pwd = password || ''
    if (name.length < 2 || name.length > 20) return { success: false, msg: '用户名需 2-20 个字符' }
    if (pwd.length < 6) return { success: false, msg: '密码至少 6 位' }
    const accounts = readAccounts()
    if (accounts[name]) return { success: false, msg: '该用户名已被注册' }
    const rec: AccountRecord = {
      uid: genUid(),
      username: name,
      passHash: hash(pwd),
      nickname: (nickname || '').trim() || name,
      avatar: '',
      createdAt: Date.now(),
    }
    accounts[name] = rec
    writeAccounts(accounts)
    wx.setStorageSync(USER_KEY, {
      uid: rec.uid,
      nickname: rec.nickname,
      avatar: rec.avatar,
      username: rec.username,
    })
    return { success: true }
  },

  /** 登录已注册账号 */
  login(username: string, password: string): { success: boolean; msg?: string } {
    const name = (username || '').trim()
    const acc = readAccounts()[name]
    if (!acc) return { success: false, msg: '账号不存在，请先注册' }
    if (acc.passHash !== hash(password || '')) return { success: false, msg: '密码不正确' }
    wx.setStorageSync(USER_KEY, {
      uid: acc.uid,
      nickname: acc.nickname,
      avatar: acc.avatar || '',
      username: acc.username,
    })
    return { success: true }
  },

  /** 退出登录：回到本机游客身份 */
  logout(): LocalUser {
    const guest = (wx.getStorageSync(GUEST_KEY) as LocalUser) || guestUser()
    wx.setStorageSync(GUEST_KEY, guest)
    wx.setStorageSync(USER_KEY, guest)
    return guest
  },

  /**
   * 需要登录才能进行的操作统一入口。
   * 已登录返回 true；未登录时提示并跳转登录页，返回 false。
   * 内部做跳转去重，避免连点导致多次 navigateTo 被丢弃（点击异常）。
   */
  requireLogin(): boolean {
    if (!this.isGuest()) return true
    if (this._redirecting) return false
    this._redirecting = true
    wx.showToast({ title: '请先登录', icon: 'none' })
    wx.navigateTo({
      url: '/pages/login/login',
      complete: () => {
        // 登录页打开后即可再次触发（无论成功失败都释放锁）
        setTimeout(() => {
          this._redirecting = false
        }, 500)
      },
    })
    return false
  },

  _redirecting: false,
}
