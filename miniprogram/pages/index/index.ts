// pages/index/index.ts
import { getList, refreshMsgBadge } from '../../utils/db'
import { CATEGORIES, formatItem } from '../../utils/util'
import { auth } from '../../utils/auth'

Page({
  data: {
    tabs: [
      { key: '', label: '全部' },
      { key: 'lost', label: '我丢的' },
      { key: 'found', label: '我捡的' },
    ],
    activeTab: '',
    categories: CATEGORIES,
    activeCategory: '',
    list: [] as any[],
    page: 0,
    pageSize: 20,
    total: 0,
    loading: false,
    finished: false,
    hasLoaded: false,
    keyword: '',
  },

  onLoad() {
    this.loadData(true)
  },

  onShow() {
    // 刷新"我的"tab 上的留言提醒角标（发布者一进小程序即可看到未读提醒）
    refreshMsgBadge()
    // 从登录页返回后身份可能变化：
    // 1) 退出登录时，若当前停留在“我丢的/我捡的”，回退到“全部”
    // 2) 已加载过则刷新列表，保证数据与身份一致
    if (!auth.isGuest()) {
      if (this.data.hasLoaded) this.loadData(true)
      return
    }
    if (this.data.activeTab === 'lost' || this.data.activeTab === 'found') {
      this.setData({ activeTab: '', keyword: '', hasLoaded: false })
      this.loadData(true)
      return
    }
    if (this.data.hasLoaded) this.loadData(true)
  },

  async loadData(reset: boolean) {
    if (this.data.loading) return
    const page = reset ? 0 : this.data.page + 1
    this.setData({ loading: true })
    const params: any = {
      category: this.data.activeCategory,
      keyword: this.data.keyword,
      page,
      pageSize: this.data.pageSize,
    }
    if (this.data.activeTab === 'lost') {
      params.type = 'lost'
      params.mine = true
    } else if (this.data.activeTab === 'found') {
      params.type = 'found'
      params.mine = true
    }
    try {
      const res: any = await getList(params)
      const list = (res.list || []).map((it: any) => formatItem(it))
      const newList = reset ? list : this.data.list.concat(list)
      this.setData({
        list: newList,
        page,
        total: res.total || 0,
        finished: newList.length >= (res.total || 0),
        hasLoaded: true,
      })
    } catch (e) {
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  onTabChange(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    if (key === 'lost' || key === 'found') {
      if (!auth.requireLogin()) return
    }
    this.setData({ activeTab: key, keyword: '' })
    this.loadData(true)
  },

  onCategoryChange(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeCategory) return
    this.setData({ activeCategory: key })
    this.loadData(true)
  },

  onSearchTap() {
    wx.switchTab({ url: '/pages/search/search' })
  },

  onCardTap(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // 封面图加载失败（本地文件被清理等）：回退为表情占位
  onCoverError(e: any) {
    const idx = e.currentTarget.dataset.index
    const key = `list[${idx}].cover`
    this.setData({ [key]: '' })
  },

  onPublishTap() {
    if (!auth.requireLogin()) return
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  onPullDownRefresh() {
    this.loadData(true)
  },

  onReachBottom() {
    if (!this.data.finished && !this.data.loading) {
      this.loadData(false)
    }
  },
})
