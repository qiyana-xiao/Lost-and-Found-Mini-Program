// app.ts
import { seedDemo } from './utils/db'
import { auth } from './utils/auth'

App<IAppOption>({
  globalData: {
    userInfo: undefined,
  },
  onLaunch() {
    // 本地模式：数据保存在小程序本地缓存（wx.storage），不依赖微信云开发
    // 首次启动写入演示数据，便于直接体验（仅执行一次）
    seedDemo(auth.getUid())
  },
})
