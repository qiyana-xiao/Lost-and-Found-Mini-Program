// pages/publish/publish.ts
import { addItem, getDetail } from '../../utils/db'
import { uploadImage, chooseImages } from '../../utils/upload'
import { CATEGORIES, todayStr } from '../../utils/util'
import { auth } from '../../utils/auth'

// 草稿按用户隔离，避免不同账号共用同一份草稿
const DRAFT_KEY = () => `LF_DRAFT_${auth.getUid()}`

Page({
  data: {
    isEdit: false,
    id: '',
    type: 'lost',
    title: '',
    categoryIndex: -1,
    categories: CATEGORIES,
    location: '',
    happenTime: todayStr(),
    description: '',
    images: [] as string[],
    contact: '',
    submitting: false,
    draftHint: '',
  },

  onLoad(options: any) {
    if (!auth.requireLogin()) return
    if (options && options.id) {
      this.setData({ isEdit: true, id: options.id })
      this.loadEdit(options.id)
    } else {
      this.restoreDraft()
    }
  },

  restoreDraft() {
    const d = wx.getStorageSync(DRAFT_KEY())
    if (d && typeof d === 'object') {
      this.setData({ ...d, draftHint: '已恢复上次草稿' })
    }
  },

  clearDraft() {
    wx.removeStorageSync(DRAFT_KEY())
    this.setData({ draftHint: '' })
  },

  // 非编辑态下自动保存草稿，避免中途退出丢失内容
  saveDraft() {
    if (this.data.isEdit) return
    const { type, title, categoryIndex, location, happenTime, description, images, contact } = this.data
    wx.setStorageSync(DRAFT_KEY(), {
      type,
      title,
      categoryIndex,
      location,
      happenTime,
      description,
      images,
      contact,
    })
  },

  // 抽取表单校验，返回错误信息字符串（空串表示通过）
  validate(): string {
    const d = this.data
    if (d.type !== 'lost' && d.type !== 'found') return '请选择类型'
    if (!d.title.trim()) return '请填写标题'
    if (d.title.trim().length > 30) return '标题不超过 30 字'
    if (d.categoryIndex < 0) return '请选择分类'
    if (!d.location.trim()) return '请填写地点'
    if (!d.contact.trim()) return '请填写联系方式'
    if (/^\d+$/.test(d.contact) && d.contact.length !== 11) return '手机号需为 11 位'
    if (d.contact.length > 20) return '联系方式过长'
    if (d.images.length === 0) return '请至少上传一张实物图'
    if (d.images.length > 3) return '最多上传 3 张图片'
    return ''
  },

  async loadEdit(id: string) {
    try {
      const res: any = await getDetail({ id })
      const it = res.item
      if (!it) return
      this.setData({
        type: it.type,
        title: it.title,
        categoryIndex: CATEGORIES.indexOf(it.category),
        location: it.location,
        happenTime: it.happenTime,
        description: it.description,
        images: it.images || [],
        contact: it.contact,
      })
      wx.setNavigationBarTitle({ title: '编辑条目' })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onTypeChange(e: any) {
    this.setData({ type: e.currentTarget.dataset.type })
    this.saveDraft()
  },
  onTitleInput(e: any) {
    this.setData({ title: e.detail.value })
    this.saveDraft()
  },
  onLocationInput(e: any) {
    this.setData({ location: e.detail.value })
    this.saveDraft()
  },
  onDateChange(e: any) {
    this.setData({ happenTime: e.detail.value })
    this.saveDraft()
  },
  onDescInput(e: any) {
    this.setData({ description: e.detail.value })
    this.saveDraft()
  },
  onContactInput(e: any) {
    this.setData({ contact: e.detail.value })
    this.saveDraft()
  },
  onCategoryChange(e: any) {
    this.setData({ categoryIndex: Number(e.detail.value) })
    this.saveDraft()
  },

  onChooseImage() {
    if (this.data.images.length >= 3) {
      wx.showToast({ title: '最多 3 张', icon: 'none' })
      return
    }
    const count = 3 - this.data.images.length
    chooseImages(count)
      .then(async (files) => {
        if (!files.length) return // 用户取消
        wx.showLoading({ title: '正在保存图片...' })
        try {
          const ids = await Promise.all(files.map((p: string) => uploadImage(p)))
          // 过滤保存失败返回空串的项，避免无效路径进入列表
          const okIds = ids.filter((p) => !!p)
          if (okIds.length === 0) {
            wx.showToast({ title: '图片保存失败，请重试', icon: 'none' })
            return
          }
          this.setData({ images: this.data.images.concat(okIds) })
          this.saveDraft()
          if (okIds.length < ids.length) {
            wx.showToast({ title: '部分图片保存失败', icon: 'none' })
          }
        } catch (err) {
          console.error('[publish] 图片处理异常:', err)
          wx.showToast({ title: '图片保存失败，请重试', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      })
      .catch((err: any) => {
        // 选图接口层面失败（chooseMedia 与 chooseImage 均失败），显示具体原因便于排查
        const msg = (err && err.message) || ''
        console.error('[publish] 选择图片失败:', err)
        wx.showToast({ title: msg ? `选图失败:${msg}` : '选择图片失败，请重试', icon: 'none' })
      })
  },

  onRemoveImage(e: any) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.slice()
    images.splice(idx, 1)
    this.setData({ images })
    this.saveDraft()
  },

  async onSubmit() {
    const { type, title, categoryIndex, categories, location, happenTime, description, images, contact, isEdit, id } = this.data
    const err = this.validate()
    if (err) return wx.showToast({ title: err, icon: 'none' })
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      const res: any = await addItem({
        id: isEdit ? id : '',
        type,
        title,
        category: categories[categoryIndex],
        location,
        happenTime,
        description,
        images,
        contact,
      })
      if (res.success) {
        if (!isEdit) this.clearDraft()
        wx.showToast({ title: isEdit ? '已保存' : '发布成功', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 700)
      } else {
        wx.showToast({ title: res.msg || '提交失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onClearDraft() {
    this.clearDraft()
    wx.showToast({ title: '已清空草稿', icon: 'none' })
  },
})
