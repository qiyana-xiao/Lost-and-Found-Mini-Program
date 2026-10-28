// pages/search/search.ts
// 与首页的定位差异：首页用于按类目浏览；搜索页提供
// 关键词实时搜索（输入防抖）、类型快筛、搜索历史、热门搜索与结果计数。
import { getList } from '../../utils/db'
import { CATEGORIES, formatItem } from '../../utils/util'

const HISTORY_KEY = 'LOSTFOUND_SEARCH_HISTORY'
const HISTORY_MAX = 10
// 热门搜索：点按即搜，覆盖高频失物关键词（如“手机”）
const HOT_KEYWORDS = ['手机', '校园卡', '耳机', '钥匙', '雨伞', '充电宝', '钱包', '课本', '眼镜']

type TypeKey = '' | 'lost' | 'found'

// 将文本按关键词拆分为高亮片段：[{ text, hit }]
const splitHighlight = (text: string, kw: string): any[] => {
  const s = String(text || '')
  if (!kw) return [{ text: s, hit: false }]
  const parts: any[] = []
  const lower = s.toLowerCase()
  const k = kw.toLowerCase()
  let i = 0
  let idx = lower.indexOf(k)
  while (idx >= 0) {
    if (idx > i) parts.push({ text: s.slice(i, idx), hit: false })
    parts.push({ text: s.slice(idx, idx + k.length), hit: true })
    i = idx + k.length
    idx = lower.indexOf(k, i)
  }
  if (i < s.length) parts.push({ text: s.slice(i), hit: false })
  return parts.length ? parts : [{ text: s, hit: false }]
}

Page({
  data: {
    keyword: '',
    categories: CATEGORIES,
    resultCategories: [] as string[],
    activeCategory: '',
    activeType: '' as TypeKey,
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

  // 是否存在有效检索条件（关键词 / 分类 / 类型）
  hasCriteria(): boolean {
    const d = this.data as any
    return !!(d.keyword.trim() || d.activeCategory || d.activeType)
  },

  // 清除输入防抖：点按类操作前调用，避免定时器延迟触发造成重复/竞争搜索
  clearDebounce() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = 0
    }
  },

  onKeywordInput(e: any) {
    const kw = e.detail.value
    this.setData({ keyword: kw })
    this.clearDebounce()
    // 清空输入：若仍有分类/类型条件则按条件搜，否则回到初始引导页
    if (!kw.trim()) {
      if (this.hasCriteria()) this.doSearch(false)
      else if (this.data.searched) this.setData({ searched: false, list: [], total: 0 })
      return
    }
    // 输入防抖自动搜索，无需每次点击按钮
    this._debounceTimer = setTimeout(() => {
      this.doSearch(false)
    }, 400) as any
  },

  onClearKeyword() {
    this.clearDebounce()
    this.setData({ keyword: '' })
    if (this.hasCriteria()) {
      this.doSearch(false)
    } else {
      this.setData({ searched: false, list: [], total: 0 })
    }
  },

  onSearch() {
    this.clearDebounce()
    this.doSearch(true)
  },

  async doSearch(save: boolean) {
    if (!this.hasCriteria()) {
      wx.showToast({ title: '请输入关键词或选择筛选条件', icon: 'none' })
      return
    }
    try {
      const kw = this.data.keyword.trim()
      const res: any = await getList({
        keyword: kw,
        category: this.data.activeCategory,
        type: this.data.activeType,
        pageSize: 100,
      })
      // 标题 / 地点中命中关键词的片段高亮，便于快速定位
      const list = (res.list || []).map((it: any) => {
        const f = formatItem(it)
        f.titleParts = splitHighlight(f.title, kw)
        f.locParts = splitHighlight(f.location || '未填写地点', kw)
        return f
      })
      // 分类 chips 仅展示结果中实际出现的分类（去重、保持 CATEGORIES 顺序），
    // 无结果或仅一个分类时隐藏，避免占据视野
    const present = new Set(list.map((it: any) => it.category).filter(Boolean))
    const resultCategories = CATEGORIES.filter((c: string) => present.has(c))
    const activeCategory = resultCategories.includes(this.data.activeCategory) ? this.data.activeCategory : ''
    this.setData({ list, total: res.total != null ? res.total : list.length, searched: true, resultCategories, activeCategory })
      if (save && kw) this.saveHistory(kw)
    } catch (e) {
      wx.showToast({ title: '搜索失败', icon: 'none' })
    }
  },

  // 分类作为“结果内二次筛选”（换行 chips，点按即筛）
  onCategoryChange(e: any) {
    this.clearDebounce()
    const key = e.currentTarget.dataset.key || ''
    if (this.data.activeCategory === key) return
    this.setData({ activeCategory: key })
    if (!this.hasCriteria()) {
      this.setData({ searched: false, list: [], total: 0 })
      return
    }
    this.doSearch(false)
  },

  // 类型快筛：全部 / 寻物 / 招领，点按即搜
  onTypeChange(e: any) {
    this.clearDebounce()
    const key = (e.currentTarget.dataset.key || '') as TypeKey
    if (this.data.activeType === key) return
    this.setData({ activeType: key })
    if (!this.hasCriteria()) {
      this.setData({ searched: false, list: [], total: 0 })
      return
    }
    this.doSearch(false)
  },

  // 点击历史 / 热门词直接搜索
  onKeywordTap(e: any) {
    this.clearDebounce()
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
