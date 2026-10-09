// utils/upload.ts 本地保存图片，返回可在 <image> 中使用的本地路径（不依赖云存储）
// 保存策略三级兜底，保证任何环境下都能拿到可用路径：
// 1) fs.saveFile        -> 持久化到本地用户文件目录（wxfile://usr/...）
// 2) fs.copyFile        -> 复制到 wx.env.USER_DATA_PATH（saveFile 失败时的备选）
// 3) 保留原始临时路径   -> 至少当前会话内可正常显示

const USER_DATA_PATH = wx.env.USER_DATA_PATH

// 将文件复制到用户目录（带正确扩展名），失败返回 ''
const copyToUserData = (filePath: string): Promise<string> =>
  new Promise((resolve) => {
    // 从临时路径或原路径中提取扩展名，便于 <image> 正确识别格式
    const dot = filePath.lastIndexOf('.')
    const ext = dot > -1 ? filePath.slice(dot).toLowerCase() : '.jpg'
    const dest = `${USER_DATA_PATH}/lf_img_${Date.now()}_${Math.floor(Math.random() * 1e4)}${ext}`
    const fs = wx.getFileSystemManager()
    fs.copyFile({
      srcPath: filePath,
      destPath: dest,
      success: () => resolve(dest),
      fail: (err) => {
        console.error('[upload] copyFile 失败:', err)
        resolve('')
      },
    })
  })

// 压缩图片，降低体积、提升列表渲染速度；压缩失败（或不支持的格式）则回退原图
export const compressImage = (filePath: string): Promise<string> =>
  new Promise((resolve) => {
    if (!filePath) {
      resolve(filePath)
      return
    }
    const ext = (filePath.split('.').pop() || '').toLowerCase()
    if (ext && ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      // 非标准可压缩格式（临时文件可能无扩展名）直接返回原图
      resolve(filePath)
      return
    }
    wx.compressImage({
      src: filePath,
      quality: 70,
      success: (res: any) => resolve(res && res.tempFilePath ? res.tempFilePath : filePath),
      fail: () => resolve(filePath),
    })
  })

export const uploadImage = async (filePath: string): Promise<string> => {
  if (!filePath) return ''
  // 先压缩再持久化，减少本地占用并加快加载
  const src = await compressImage(filePath)
  const fs = wx.getFileSystemManager()
  try {
    const res: any = await new Promise((resolve, reject) => {
      fs.saveFile({ tempFilePath: src, success: resolve, fail: reject })
    })
    return res.savedFilePath
  } catch (err) {
    console.error('[upload] saveFile 失败，尝试 copyFile 兜底:', err)
    const p = await copyToUserData(src)
    // copyFile 也失败则退回（压缩后的）临时路径，保证流程可用
    return p || src
  }
}

// 批量上传
export const uploadImages = (filePathList: string[]): Promise<string[]> =>
  Promise.all(filePathList.map((p) => uploadImage(p)))

/**
 * 统一选图入口（带兜底）：
 * 优先 wx.chooseMedia；在部分开发者工具中 chooseMedia 存在已知兼容问题，
 * 失败（非用户取消）时自动回退旧版 wx.chooseImage；仍失败则 reject 具体 errMsg。
 * 用户取消时 resolve([])。
 */
export const chooseImages = (count: number): Promise<string[]> =>
  new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res: any) => {
        const paths = ((res && res.tempFiles) || [])
          .map((f: any) => f.tempFilePath)
          .filter(Boolean)
        resolve(paths)
      },
      fail: (err: any) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') !== -1) {
          resolve([])
          return
        }
        console.warn('[upload] chooseMedia 失败，回退 chooseImage 重试:', err)
        wx.chooseImage({
          count,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res2: any) => {
            resolve((res2 && res2.tempFilePaths) || [])
          },
          fail: (err2: any) => {
            const msg2 = (err2 && err2.errMsg) || ''
            if (msg2.indexOf('cancel') !== -1) {
              resolve([])
            } else {
              console.error('[upload] chooseImage 也失败:', err2)
              reject(new Error(msg2 || 'chooseImage fail'))
            }
          },
        })
      },
    })
  })

// 校验本地文件是否仍存在（用于列表封面加载失败后的兜底判断）
export const fileExists = (filePath: string): boolean => {
  try {
    wx.getFileSystemManager().accessSync(filePath)
    return true
  } catch (e) {
    return false
  }
}
