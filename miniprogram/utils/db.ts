// utils/db.ts 本地存储实现（不依赖微信云开发）
// 数据保存在小程序本地缓存（wx.storage），适合单机 / 离线演示。
// 接口与原云函数版本保持一致，页面调用无需改动。

import { auth } from './auth'

const ITEMS_KEY = 'LOSTFOUND_ITEMS'
const MESSAGES_KEY = 'LOSTFOUND_MESSAGES'

// 用户标识统一走 auth（替代云函数中的 OPENID）
const getUid = (): string => auth.getUid()

// 列表缓存：wx.storage 读取有开销，写入后同步更新缓存引用，避免重复解析
let _itemsCache: any[] | null = null

const readItems = (): any[] => {
  if (_itemsCache) return _itemsCache
  _itemsCache = wx.getStorageSync(ITEMS_KEY) || []
  return _itemsCache
}
const writeItems = (list: any[]): void => {
  wx.setStorageSync(ITEMS_KEY, list)
  _itemsCache = list
}
const readMessages = (): any[] => wx.getStorageSync(MESSAGES_KEY) || []
const writeMessages = (list: any[]): void => wx.setStorageSync(MESSAGES_KEY, list)

const genId = (prefix: string): string =>
  prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)

// 列表查询：支持 type / category / keyword / status / 仅看自己 过滤，按 createdAt 倒序分页
export const getList = async (params: any = {}): Promise<any> => {
  const { type, category, keyword, mine, status, page = 0, pageSize = 20 } = params
  const uid = getUid()
  let list = readItems()

  if (type) list = list.filter((it) => it.type === type)
  if (category) list = list.filter((it) => it.category === category)
  if (status) list = list.filter((it) => it.status === status)
  if (mine) list = list.filter((it) => it._openid === uid)
  if (keyword) {
    const kw = String(keyword).toLowerCase()
    list = list.filter(
      (it) =>
        (it.title || '').toLowerCase().includes(kw) ||
        (it.location || '').toLowerCase().includes(kw) ||
        (it.description || '').toLowerCase().includes(kw),
    )
  }

  list = list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const total = list.length
  const paged = list.slice(page * pageSize, page * pageSize + pageSize)
  return { list: paged, total }
}

// 详情查询：条目 + 留言列表 + 是否发布者
export const getDetail = async (params: any = {}): Promise<any> => {
  const { id } = params
  const item = readItems().find((it) => it._id === id) || null
  if (!item) return { item: null, messages: [], isOwner: false }
  const messages = readMessages()
    .filter((m) => m.itemId === id)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  return { item, messages, isOwner: item._openid === getUid() }
}

// 个人中心统计：发布数 / 已认领 / 失物 / 招领
export const getStats = async (uid?: string): Promise<any> => {
  const id = uid || getUid()
  const list = readItems().filter((it) => it._openid === id)
  return {
    total: list.length,
    closed: list.filter((it) => it.status === 'closed').length,
    lost: list.filter((it) => it.type === 'lost').length,
    found: list.filter((it) => it.type === 'found').length,
  }
}

// 新增 / 编辑条目：校验必填 + 发布频率限制（同用户 1 分钟最多 3 条）
export const addItem = async (params: any = {}): Promise<any> => {
  const {
    id,
    type,
    title,
    category,
    description,
    location,
    happenTime,
    images,
    contact,
  } = params

  if (!type || !['lost', 'found'].includes(type)) return { success: false, msg: '类型不正确' }
  if (!title || !title.trim()) return { success: false, msg: '请填写标题' }
  if (!category) return { success: false, msg: '请选择分类' }
  if (!location || !location.trim()) return { success: false, msg: '请填写地点' }
  if (!contact || !contact.trim()) return { success: false, msg: '请填写联系方式' }

  const uid = getUid()
  const list = readItems()

  if (!id) {
    const oneMinAgo = Date.now() - 60 * 1000
    const recent = list.filter((it) => it._openid === uid && (it.createdAt || 0) >= oneMinAgo)
    if (recent.length >= 3) return { success: false, msg: '发布过于频繁，请稍后再试' }
  }

  const data = {
    type,
    title: title.trim(),
    category,
    description: (description || '').trim(),
    location: location.trim(),
    happenTime: happenTime || '',
    images: images || [],
    contact: contact.trim(),
  }

  if (id) {
    const idx = list.findIndex((it) => it._id === id)
    if (idx < 0) return { success: false, msg: '条目不存在' }
    if (list[idx]._openid !== uid) return { success: false, msg: '无权编辑该条目' }
    list[idx] = { ...list[idx], ...data, updatedAt: Date.now() }
    writeItems(list)
    return { success: true, id }
  }

  const newItem = {
    ...data,
    _id: genId('i_'),
    _openid: uid,
    status: 'open',
    viewCount: 0,
    createdAt: Date.now(),
  }
  list.push(newItem)
  writeItems(list)
  return { success: true, id: newItem._id }
}

// 浏览数 +1
export const incrementView = async (params: any = {}): Promise<any> => {
  const { id } = params
  if (!id) return { success: false }
  const list = readItems()
  const idx = list.findIndex((it) => it._id === id)
  if (idx < 0) return { success: false }
  list[idx] = { ...list[idx], viewCount: (list[idx].viewCount || 0) + 1 }
  writeItems(list)
  return { success: true }
}

// 新增认领留言
export const addMessage = async (params: any = {}): Promise<any> => {
  const { itemId, content, contact } = params
  if (!itemId || !content || !content.trim()) return { success: false, msg: '请输入留言内容' }
  const messages = readMessages()
  messages.push({
    _id: genId('m_'),
    itemId,
    content: content.trim(),
    contact: (contact || '').trim(),
    _openid: getUid(),
    createdAt: Date.now(),
  })
  writeMessages(messages)
  return { success: true }
}

// 标记已认领（仅发布者）
export const closeItem = async (params: any = {}): Promise<any> => {
  const { id } = params
  if (!id) return { success: false, msg: '缺少 id' }
  const list = readItems()
  const idx = list.findIndex((it) => it._id === id)
  if (idx < 0) return { success: false, msg: '条目不存在' }
  if (list[idx]._openid !== getUid()) return { success: false, msg: '无权操作' }
  list[idx] = { ...list[idx], status: 'closed', updatedAt: Date.now() }
  writeItems(list)
  return { success: true }
}

// 删除条目（仅发布者）：级联删除本地图片与关联留言
export const deleteItem = async (params: any = {}): Promise<any> => {
  const { id } = params
  if (!id) return { success: false, msg: '缺少 id' }
  const list = readItems()
  const idx = list.findIndex((it) => it._id === id)
  if (idx < 0) return { success: false, msg: '条目不存在' }
  if (list[idx]._openid !== getUid()) return { success: false, msg: '无权删除该条目' }

  const images = list[idx].images || []
  if (images.length) {
    const fs = wx.getFileSystemManager()
    images.forEach((p: string) => {
      // 仅清理本地保存的图片（云文件ID以 cloud:// 开头）
      if (p && p.indexOf('cloud://') !== 0) {
        try {
          fs.removeSavedFile({ filePath: p })
        } catch (e) {
          // 忽略清理失败（如为临时路径）
        }
      }
    })
  }

  writeMessages(readMessages().filter((m) => m.itemId !== id))
  list.splice(idx, 1)
  writeItems(list)
  return { success: true }
}

// ===== 留言消息提醒（本地版） =====
// 每个 uid 维护一份"条目 -> 最近一次查看留言的时间戳"映射，存储于本地缓存。
// 未读 = 该用户作为发布者的条目下，由"其他用户"留言且晚于上次查看时间的留言。

const readKeyOf = (uid: string): string => `LOSTFOUND_MSG_READ_${uid}`
const readReadMap = (uid: string): Record<string, number> =>
  wx.getStorageSync(readKeyOf(uid)) || {}

export interface UnreadInfo {
  itemId: string
  title: string
  count: number
  latestTime: number
  latestContent: string
}

export interface MessageGroup {
  itemId: string
  title: string
  count: number
  unreadCount: number
  latestTime: number
  latestContent: string
  latestContact: string
}

/** 获取某 uid 作为发布者收到的未读留言（按条目聚合，最新在前） */
export const getUnreadList = async (uid?: string): Promise<UnreadInfo[]> => {
  const id = uid || getUid()
  const myItems = readItems().filter((it) => it._openid === id)
  if (!myItems.length) return []
  const readMap = readReadMap(id)
  const messages = readMessages()
  const result: UnreadInfo[] = []
  myItems.forEach((it) => {
    const lastRead = readMap[it._id] || 0
    const unread = messages.filter(
      (m) => m.itemId === it._id && m._openid !== id && (m.createdAt || 0) > lastRead,
    )
    if (unread.length) {
      const latest = unread[unread.length - 1]
      result.push({
        itemId: it._id,
        title: it.title || '未命名条目',
        count: unread.length,
        latestTime: latest.createdAt || 0,
        latestContent: latest.content || '',
      })
    }
  })
  return result.sort((a, b) => b.latestTime - a.latestTime)
}

/** 获取某 uid 作为发布者收到的全部留言聚合（含已读/未读，最新在前） */
export const getMessageList = async (uid?: string): Promise<MessageGroup[]> => {
  const id = uid || getUid()
  const myItems = readItems().filter((it) => it._openid === id)
  if (!myItems.length) return []
  const readMap = readReadMap(id)
  const messages = readMessages()
  const result: MessageGroup[] = []
  myItems.forEach((it) => {
    const itemMsgs = messages
      .filter((m) => m.itemId === it._id && m._openid !== id)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    if (!itemMsgs.length) return
    const lastRead = readMap[it._id] || 0
    const unread = itemMsgs.filter((m) => (m.createdAt || 0) > lastRead)
    const latest = itemMsgs[itemMsgs.length - 1]
    result.push({
      itemId: it._id,
      title: it.title || '未命名条目',
      count: itemMsgs.length,
      unreadCount: unread.length,
      latestTime: latest.createdAt || 0,
      latestContent: latest.content || '',
      latestContact: latest.contact || '',
    })
  })
  return result.sort((a, b) => b.latestTime - a.latestTime)
}

/** 标记某条目的留言为已读（进入详情页时调用） */
export const markItemRead = async (itemId: string, uid?: string): Promise<void> => {
  if (!itemId) return
  const id = uid || getUid()
  const map = readReadMap(id)
  map[itemId] = Date.now()
  wx.setStorageSync(readKeyOf(id), map)
}

/** 标记当前用户所有条目的留言为已读 */
export const markAllRead = async (uid?: string): Promise<void> => {
  const id = uid || getUid()
  const map = readReadMap(id)
  const now = Date.now()
  readItems()
    .filter((it) => it._openid === id)
    .forEach((it) => {
      map[it._id] = now
    })
  wx.setStorageSync(readKeyOf(id), map)
}

// "消息"tab 在 tabBar 中的位置
const MSG_TAB_INDEX = 1

/** 根据当前用户未读留言数刷新 tabBar 角标（登录切换 / 打开详情后调用） */
export const refreshMsgBadge = async (): Promise<void> => {
  try {
    const unread = await getUnreadList()
    const count = unread.reduce((s, it) => s + it.count, 0)
    if (count > 0) {
      wx.setTabBarBadge({
        index: MSG_TAB_INDEX,
        text: count > 99 ? '99+' : String(count),
        fail: () => {},
      })
    } else {
      wx.removeTabBarBadge({ index: MSG_TAB_INDEX, fail: () => {} })
    }
  } catch (e) {
    // 角标刷新失败不影响主流程
  }
}

// 首次启动写入演示数据（移植自设计稿 seedDemo），避免空列表、便于演示
const SEEDED_KEY = 'LOSTFOUND_SEEDED'

export const seedDemo = (uid?: string): void => {
  if (wx.getStorageSync(SEEDED_KEY)) return
  const now = Date.now()
  const fmtDate = (t: number): string => {
    const d = new Date(t)
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const owner = uid || getUid()
  const items = [
    {
      _id: 'demo_1',
      _openid: 'demo_user_001',
      type: 'lost',
      title: '黑色华为 FreeBuds 耳机',
      category: '电子产品',
      location: '图书馆三楼自习区',
      happenTime: fmtDate(now - 3 * 3600 * 1000),
      description: '左耳丢失、右耳还在，有黑色充电盒，急寻！',
      images: [],
      contact: 'wx: lost_demo',
      status: 'open',
      viewCount: 18,
      createdAt: now - 30 * 60 * 1000,
    },
    {
      _id: 'demo_2',
      _openid: 'demo_user_001',
      type: 'found',
      title: '蓝色校园卡（无名）',
      category: '校园卡',
      location: '第一食堂门口',
      happenTime: fmtDate(now - 5 * 3600 * 1000),
      description: '捡到一张校园卡，卡套是蓝色的，请失主联系核对。',
      images: [],
      contact: 'wx: found_demo',
      status: 'open',
      viewCount: 9,
      createdAt: now - 2 * 3600 * 1000,
    },
    {
      _id: 'demo_3',
      _openid: owner,
      type: 'found',
      title: '《高等数学》教材一本',
      category: '书籍文具',
      location: '教学楼 A 区 203',
      happenTime: fmtDate(now - 26 * 3600 * 1000),
      description: '书内有大量笔记，扉页写着一个名字。',
      images: [],
      contact: 'wx: book_demo',
      status: 'closed',
      viewCount: 33,
      createdAt: now - 26 * 3600 * 1000,
    },
    {
      _id: 'demo_4',
      _openid: 'demo_user_001',
      type: 'lost',
      title: '黑色长柄雨伞',
      category: '雨伞水杯',
      location: '体育馆更衣室',
      happenTime: fmtDate(now - 50 * 3600 * 1000),
      description: '运动会当天落下的，伞面有蓝色条纹。',
      images: [],
      contact: 'wx: umbrella_demo',
      status: 'open',
      viewCount: 5,
      createdAt: now - 50 * 60 * 1000,
    },
    {
      _id: 'demo_5',
      _openid: owner,
      type: 'lost',
      title: '棕色钱包（内含证件）',
      category: '钱包证件',
      location: '校门口公交站',
      happenTime: fmtDate(now - 72 * 3600 * 1000),
      description: '钱包里有身份证和银行卡，捡到者重谢！',
      images: [],
      contact: 'wx: wallet_demo',
      status: 'open',
      viewCount: 21,
      createdAt: now - 72 * 3600 * 1000,
    },
  ]
  const messages = [
    { _id: 'dm_1', itemId: 'demo_2', content: '请问卡还在吗？我好像丢了一张', contact: 'wx: asker_1', _openid: 'demo_user_002', createdAt: now - 60 * 60 * 1000 },
    { _id: 'dm_2', itemId: 'demo_2', content: '在的，核对一下姓名即可领取', contact: '', _openid: owner, createdAt: now - 30 * 60 * 1000 },
  ]
  writeItems(items)
  writeMessages(messages)
  wx.setStorageSync(SEEDED_KEY, true)
}
