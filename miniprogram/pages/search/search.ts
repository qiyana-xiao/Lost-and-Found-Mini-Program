// pages/search/search.ts
// 与首页的定位差异：首页用于按类目浏览；搜索页提供
// 关键词实时搜索（输入防抖）、搜索历史、热门搜索与结果计数。
import { getList } from '../../utils/db'
import { CATEGORIES, formatItem } from '../../utils/util'

const HISTORY_KEY = 'LOSTFOUND_SEARCH_HISTORY'
const HISTORY_MAX = 10
const HOT_KEYWORDS = ['校园卡', '耳机', '钥匙', '雨伞', '充电宝', '钱包', '课本', '眼镜']

Page({
  data: {
    keyword: '',
    categories: CATEGORIES,
    activeCategory: '',
    list: [] as any[],
    total: 0,
    searched: false,
    history: [] as string[],
    hot: HOT_KEYWORDS,
  },

  // 输入防抖定时器（非渲染数据，不放入 data）
  _debounceTimer: 0 as any,

  onLoad() {
    this.setData({ history: this.readHistory() })
  },

  readHistory(): string[] {
    try {
      return wx.getStorageSync(HISTORY_KEY) || []
    } catch (e) {
      return []
    }
  },

  saveHistory(kw: string) {
    if (!kw) return
    let h = this.readHistory().filter((k) => k !== kw)
    h.unshift(kw)
    if (h.length > HISTORY_MAX) h = h.slice(0, HISTORY_MAX)
    wx.setStorageSync(HISTORY_KEY, h)
    this.setData({ history: h })
  },

  onClearHistory() {
    wx.showModal({
      title: '清空搜索历史',
      content: '确定清空全部搜索历史吗？',
      success: (r) => {
        if (!r.confirm) return
        try {
          wx.removeStorageSync(HISTORY_KEY)
        } catch (e) {}
        this.setData({ history: [] })
      },
    })
  },

  onKeywordInput(e: any) {
    const kw = e.detail.value
    this.setData({ keyword: kw })
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = 0
    }
    // 清空输入：回到初始引导页（历史 + 热门）
    if (!kw.trim()) {
      if (this.data.searched) this.setData({ searched: false, list: [], total: 0 })
      return
    }
    // 输入防抖自动搜索，无需每次点击按钮
    this._debounceTimer = setTimeout(() => {
      this.doSearch(false)
    }, 400) as any
  },

  onClearKeyword() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = 0
    }
    this.setData({ keyword: '', searched: false, list: [], total: 0 })
  },

  onSearch() {
    this.doSearch(true)
  },

  async doSearch(save: boolean) {
    const kw = this.data.keyword.trim()
    if (!kw && !this.data.activeCategory) {
      wx.showToast({ title: '请输入关键词或选择分类', icon: 'none' })
      return
    }
    try {
      const res: any = await getList({
        keyword: kw,
        category: this.data.activeCategory,
        pageSize: 100,
      })
      const list = (res.list || []).map((it: any) => formatItem(it))
      this.setData({ list, total: res.total != null ? res.total : list.length, searched: true })
      if (save && kw) this.saveHistory(kw)
    } catch (e) {
      wx.showToast({ title: '搜索失败', icon: 'none' })
    }
  },

  // 分类作为“结果内二次筛选”
  onCategoryChange(e: any) {
    const key = e.currentTarget.dataset.key || ''
    if (this.data.activeCategory === key) return
    this.setData({ activeCategory: key })
    if (key === '' && !this.data.keyword.trim()) {
      this.setData({ searched: false, list: [], total: 0 })
      return
    }
    this.doSearch(false)
  },

  // 点击历史 / 热门词直接搜索
  onKeywordTap(e: any) {
    const kw = e.currentTarget.dataset.kw as string
    if (!kw) return
    this.setData({ keyword: kw })
    this.doSearch(true)
  },

  onCardTap(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // 封面图加载失败：回退为表情占位
  onCoverError(e: any) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`list[${idx}].cover`]: '' })
  },
})
