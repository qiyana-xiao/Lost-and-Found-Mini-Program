// utils/util.ts 公共工具方法

export const CATEGORIES = [
  '校园卡', '电子产品', '书籍文具', '钥匙', '雨伞水杯', '钱包证件', '衣物配饰', '其他',
]

const CATEGORY_EMOJI: Record<string, string> = {
  校园卡: '🪪',
  电子产品: '📱',
  书籍文具: '📚',
  钥匙: '🔑',
  雨伞水杯: '☂️',
  钱包证件: '👛',
  衣物配饰: '👕',
  其他: '📦',
}

export const categoryEmoji = (category: string): string => CATEGORY_EMOJI[category] || '📦'

const formatNumber = (n: number): string => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

export const formatTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

// 时间戳 -> YYYY-MM-DD
export const formatDate = (ts: number): string => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${formatNumber(d.getMonth() + 1)}-${formatNumber(d.getDate())}`
}

// 相对时间：刚刚 / X分钟前 / X小时前 / X天前 / M月D日（移植自设计稿 formatTime）
export const formatRelative = (ts: number | string): string => {
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime()
  if (!t || isNaN(t)) return ''
  const diff = Date.now() - t
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return Math.floor(diff / min) + '分钟前'
  if (diff < day) return Math.floor(diff / hour) + '小时前'
  if (diff < 7 * day) return Math.floor(diff / day) + '天前'
  const d = new Date(t)
  return d.getMonth() + 1 + '月' + d.getDate() + '日'
}

// 今天 YYYY-MM-DD
export const todayStr = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${formatNumber(d.getMonth() + 1)}-${formatNumber(d.getDate())}`
}

// 联系方式脱敏：手机 138****8000，其他首尾保留
export const maskContact = (contact: string): string => {
  if (!contact) return ''
  const phone = contact.replace(/\D/g, '')
  if (phone.length === 11) {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
  if (contact.length > 4) {
    return contact.slice(0, 2) + '****' + contact.slice(-2)
  }
  return contact
}

// 将数据库条目转换为页面展示对象（补充表情、标签文案、脱敏等）
export const formatItem = (item: any): any => {
  if (!item) return item
  return {
    ...item,
    emoji: categoryEmoji(item.category),
    typeLabel: item.type === 'lost' ? '寻物' : '招领',
    typeClass: item.type === 'lost' ? 'tag-lost' : 'tag-found',
    statusLabel: item.status === 'open' ? '进行中' : '已认领',
    statusClass: item.status === 'open' ? 'badge-open' : 'badge-closed',
    contactMasked: maskContact(item.contact),
    cover: item.images && item.images.length ? item.images[0] : '',
    happenTimeText: item.happenTime || '',
    createdAtText: item.createdAt ? formatDate(item.createdAt) : '',
    createdAtRel: item.createdAt ? formatRelative(item.createdAt) : '',
    viewText: item.viewCount || 0,
  }
}
