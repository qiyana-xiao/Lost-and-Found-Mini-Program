// pages/detail/detail.ts
import { getDetail, incrementView, addMessage, closeItem, markItemRead, refreshMsgBadge } from '../../utils/db'
import { formatItem, formatDate } from '../../utils/util'
import { auth } from '../../utils/auth'

Page({
  data: {
    id: '',
    item: null as any,
    messages: [] as any[],
    isOwner: false,
    loading: true,
    showMsgModal: false,
    modalContact: '',
    modalContent: '',
    brokenMap: {} as Record<number, boolean>,
  },

  // 非渲染数据：留言提交去重
  _submittingMsg: false,

  onLoad(options: any) {
    const id = options.id || ''
    this.setData({ id })
    this.loadDetail()
    incrementView({ id }).catch(() => {})
  },

  async loadDetail() {
    this.setData({ loading: true })
    try {
      const res: any = await getDetail({ id: this.data.id })
      this.setData({
        item: formatItem(res.item),
        messages: (res.messages || []).map((m: any) => ({
          ...m,
          timeText: formatDate(m.createdAt),
        })),
        isOwner: res.isOwner,
        loading: false,
      })
      // 发布者打开详情页即视为已读，同时刷新 tabBar 角标
      if (res.isOwner) {
        markItemRead(this.data.id)
        refreshMsgBadge()
      }
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onCopyContact() {
    if (!this.data.item) return
    wx.setClipboardData({
      data: this.data.item.contact,
      success: () => wx.showToast({ title: '已复制联系方式', icon: 'none' }),
    })
  },

  onImageTap(e: any) {
    const urls = this.data.item.images || []
    const current = e.currentTarget.dataset.src
    if (urls.length) wx.previewImage({ urls, current })
  },

  onImageError(e: any) {
    const idx = e.currentTarget.dataset.idx
    if (idx == null) return
    this.setData({ [`brokenMap[${idx}]`]: true })
  },

  onShowMsg() {
    if (!auth.requireLogin()) return
    this.setData({ showMsgModal: true, modalContact: '', modalContent: '' })
  },

  onHideMsg() {
    this.setData({ showMsgModal: false, modalContact: '', modalContent: '' })
  },

  onModalContactInput(e: any) {
    this.setData({ modalContact: e.detail.value })
  },

  onModalContentInput(e: any) {
    this.setData({ modalContent: e.detail.value })
  },

  async onSubmitMessage() {
    if (this._submittingMsg) return
    const content = this.data.modalContent.trim()
    if (!content) return wx.showToast({ title: '请输入留言', icon: 'none' })
    this._submittingMsg = true
    try {
      await addMessage({ itemId: this.data.id, content, contact: this.data.modalContact.trim() })
      this.setData({ showMsgModal: false, modalContact: '', modalContent: '' })
      wx.showToast({ title: '留言成功', icon: 'success' })
      this.loadDetail()
    } catch (err) {
      wx.showToast({ title: '留言失败', icon: 'none' })
    } finally {
      this._submittingMsg = false
    }
  },

  async onClose() {
    wx.showModal({
      title: '确认',
      content: '确定标记为已认领？',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await closeItem({ id: this.data.id })
          wx.showToast({ title: '已标记', icon: 'success' })
          this.loadDetail()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      },
    })
  },
})
