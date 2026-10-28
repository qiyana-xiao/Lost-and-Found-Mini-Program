// pages/messages/messages.ts
import { getMessageList, markItemRead, markAllRead, refreshMsgBadge } from '../../utils/db'
import { formatRelative } from '../../utils/util'
import { auth } from '../../utils/auth'

Page({
  data: {
    list: [] as any[],
    total: 0,
    unreadTotal: 0,
    loading: true,
    isGuest: true,
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const user = auth.getUser()
    if (!user.username) {
      this.setData({ isGuest: true, list: [], total: 0, unreadTotal: 0, loading: false })
      return
    }
    this.setData({ loading: true, isGuest: false })
    try {
      const list = await getMessageList()
      const formatted = list.map((it) => ({
        ...it,
        timeText: formatRelative(it.latestTime),
      }))
      this.setData({
        list: formatted,
        total: formatted.reduce((s, it) => s + it.count, 0),
        unreadTotal: formatted.reduce((s, it) => s + it.unreadCount, 0),
        loading: false,
      })
    } catch (e) {
      this.setData({ list: [], total: 0, unreadTotal: 0, loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 点击消息条目：标记已读并跳转到详情页
  async onItemTap(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    await markItemRead(id)
    this.loadData()
    refreshMsgBadge()
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // 全部已读
  async onMarkAll() {
    if (this.data.unreadTotal === 0) {
      wx.showToast({ title: '暂无未读消息', icon: 'none' })
      return
    }
    wx.showModal({
      title: '全部已读',
      content: '确定将所有消息标记为已读？',
      success: async (r) => {
        if (!r.confirm) return
        await markAllRead()
        this.loadData()
        refreshMsgBadge()
        wx.showToast({ title: '已全部已读', icon: 'success' })
      },
    })
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login?mode=login' })
  },
})
