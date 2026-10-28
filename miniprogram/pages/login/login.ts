// pages/login/login.ts
import { auth } from '../../utils/auth'

Page({
  data: {
    authMode: 'login' as 'login' | 'register',
    inputUsername: '',
    inputPassword: '',
    inputNickname: '',
    submitting: false,
  },

  onLoad(options: any) {
    const mode = options && options.mode
    this.setData({ authMode: mode === 'register' ? 'register' : 'login' })
  },

  onSwitchMode(e: any) {
    if (this.data.submitting) return
    const mode = e.currentTarget.dataset.mode as 'login' | 'register'
    this.setData({ authMode: mode, inputPassword: '', inputNickname: '' })
  },

  onUsernameInput(e: any) {
    this.setData({ inputUsername: e.detail.value })
  },

  onPasswordInput(e: any) {
    this.setData({ inputPassword: e.detail.value })
  },

  onNicknameInput(e: any) {
    this.setData({ inputNickname: e.detail.value })
  },

  onSubmitAuth() {
    if (this.data.submitting) return
    const mode = this.data.authMode
    const username = this.data.inputUsername.trim()
    const password = this.data.inputPassword
    const nickname = this.data.inputNickname.trim()

    if (!username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (mode === 'register' && (username.length < 2 || username.length > 20)) {
      wx.showToast({ title: '用户名需 2-20 个字符', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    const r = mode === 'login' ? auth.login(username, password) : auth.register(username, password, nickname)
    if (!r.success) {
      this.setData({ submitting: false })
      wx.showToast({ title: r.msg || '操作失败', icon: 'none' })
      return
    }

    wx.showToast({ title: mode === 'login' ? '登录成功' : '注册成功', icon: 'success' })
    setTimeout(() => {
      this.setData({ submitting: false })
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({ url: '/pages/index/index' })
      }
    }, 600)
  },
})
