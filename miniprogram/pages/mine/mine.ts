// pages/mine/mine.ts
import { getList, deleteItem, getStats, closeItem, getUnreadList, markItemRead, refreshMsgBadge } from '../../utils/db'
import { formatItem, formatRelative } from '../../utils/util'
import { uploadImage, chooseImages } from '../../utils/upload'
import { auth } from '../../utils/auth'

type FilterKey = 'all' | 'closed' | 'lost' | 'found'

const FILTER_LABEL: Record<FilterKey, string> = {
  all: '我的发布',
  closed: '我的发布 · 已认领',
  lost: '我的发布 · 失物',
  found: '我的发布 · 招领',
}

Page({
  data: {
    list: [] as any[],
    loading: true,
    nickname: '微信用户',
    avatarText: '微',
    avatar: '',
    shortUid: '',
    isGuest: true,
    username: '',
    stats: { total: 0, closed: 0, lost: 0, found: 0 },
    filter: 'all' as FilterKey,
    filterLabel: '我的发布',
    emptyText: '还没有发布过任何条目',
    unreadList: [] as any[],
    unreadTotal: 0,
  },

  // 非渲染数据：登录页跳转去重
  _redirecting: false,

  onShow() {
    this.loadProfile()
    this.loadData()
    this.loadUnread()
    refreshMsgBadge()
  },

  loadProfile() {
    const user = auth.getUser()
    const uid = user.uid
    this.setData({
      nickname: user.nickname,
      avatarText: (user.nickname || '微').charAt(0),
      avatar: user.avatar || '',
      shortUid: uid.length > 16 ? uid.slice(0, 16) + '…' : uid,
      isGuest: !user.username,
      username: user.username || '',
    })
    if (!user.username) {
      this.setData({ stats: { total: 0, closed: 0, lost: 0, found: 0 } })
      return
    }
    getStats(uid)
      .then((s) => this.setData({ stats: s }))
      .catch(() => {})
  },

  // 未读留言统计（作为发布者收到的留言）
  async loadUnread() {
    if (this.data.isGuest) {
      this.setData({ unreadList: [], unreadTotal: 0 })
      return
    }
    try {
      const unread = await getUnreadList()
      this.setData({
        unreadList: unread.map((u) => ({ ...u, timeText: formatRelative(u.latestTime) })),
        unreadTotal: unread.reduce((s, u) => s + u.count, 0),
      })
    } catch (e) {
      this.setData({ unreadList: [], unreadTotal: 0 })
    }
  },

  // 点击提醒横幅：跳到对应条目详情（详情页会自动标记已读）
  onUnreadTap(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    // 即时标记已读并刷新本页未读/角标，无需退出重进才更新
    markItemRead(id)
    this.loadUnread()
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  async loadData() {
    if (this.data.isGuest) {
      this.setData({ list: [], loading: false })
      return
    }
    this.setData({ loading: true })
    const filter = this.data.filter as FilterKey
    const params: any = { mine: true, pageSize: 100 }
    if (filter === 'closed') params.status = 'closed'
    if (filter === 'lost') params.type = 'lost'
    if (filter === 'found') params.type = 'found'
    try {
      const res: any = await getList(params)
      const list = (res.list || []).map((it: any) => formatItem(it))
      this.setData({ list, loading: false })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 点击统计卡：按 发布 / 已认领 / 失物 / 招领 筛选下方列表
  onStatTap(e: any) {
    const key = e.currentTarget.dataset.key as FilterKey
    if (this.data.filter === key) return
    this.setData({
      filter: key,
      filterLabel: FILTER_LABEL[key] || FILTER_LABEL.all,
      emptyText: key === 'all' ? '还没有发布过任何条目' : '暂无符合条件的发布',
    })
    this.loadData()
  },

  onGoLogin() {
    if (this._redirecting) return
    this._redirecting = true
    wx.navigateTo({
      url: '/pages/login/login?mode=login',
      complete: () => {
        setTimeout(() => {
          this._redirecting = false
        }, 500)
      },
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号，返回游客身份？',
      success: (r) => {
        if (!r.confirm) return
        auth.logout()
        wx.showToast({ title: '已退出登录', icon: 'none' })
        this.setData({
          filter: 'all',
          filterLabel: FILTER_LABEL.all,
          emptyText: '还没有发布过任何条目',
          list: [],
          loading: false,
          unreadList: [],
          unreadTotal: 0,
        })
        this.loadProfile()
        this.loadData()
        refreshMsgBadge()
      },
    })
  },

  onCardTap(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onGoPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  onEditNick() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入新昵称',
      success: (r) => {
        if (!r.confirm || !r.content || !r.content.trim()) return
        const u = auth.updateUser({ nickname: r.content.trim() })
        this.setData({
          nickname: u.nickname,
          avatarText: (u.nickname || '微').charAt(0),
        })
        wx.showToast({ title: '已保存', icon: 'success' })
      },
    })
  },

  // 修改头像：选择图片 -> 本地保存 -> 更新用户资料
  onEditAvatar() {
    const that = this
    chooseImages(1)
      .then(async (paths) => {
        const tempPath = paths && paths[0]
        if (!tempPath) return // 用户取消
        wx.showLoading({ title: '正在保存头像...' })
        try {
          const saved = await uploadImage(tempPath)
          wx.hideLoading()
          if (!saved) {
            wx.showToast({ title: '头像保存失败，请重试', icon: 'none' })
            return
          }
          // 尽力清理旧头像文件（失败不影响流程）
          const old = that.data.avatar
          if (old) {
            try {
              wx.getFileSystemManager().removeSavedFile({ filePath: old, fail: () => {} })
            } catch (e) {}
          }
          const u = auth.updateUser({ avatar: saved })
          that.setData({ avatar: u.avatar || saved })
          wx.showToast({ title: '头像已更新', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          console.error('[mine] 头像保存失败:', err)
          wx.showToast({ title: '头像保存失败，请重试', icon: 'none' })
        }
      })
      .catch((err: any) => {
        const msg = (err && err.message) || ''
        console.error('[mine] 选择头像失败:', err)
        wx.showToast({ title: msg ? `选图失败:${msg}` : '选择图片失败，请重试', icon: 'none' })
      })
  },

  // 快捷"标记已认领"：列表内直接操作，无需进入详情页
  onMarkClosed(e: any) {
    const id = e.currentTarget.dataset.id as string
    if (!id) return
    wx.showModal({
      title: '标记已认领',
      content: '确定将该条目标记为已认领？标记后可继续编辑。',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await closeItem({ id })
          wx.showToast({ title: '已标记为已认领', icon: 'success' })
          this.loadProfile()
          this.loadData()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      },
    })
  },

  // 列表封面加载失败：回退表情占位
  onCoverError(e: any) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`list[${idx}].cover`]: '' })
  },

  async onEdit(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/publish/publish?id=${id}` })
  },

  onDelete(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除确认',
      content: '删除后不可恢复，确定删除该条目？',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await deleteItem(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadProfile()
          this.loadData()
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      },
    })
  },
})
