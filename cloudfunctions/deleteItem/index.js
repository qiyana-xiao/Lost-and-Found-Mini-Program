const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 删除条目（仅发布者）：级联删除云存储图片与关联留言
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event
  if (!id) return { success: false, msg: '缺少 id' }

  const doc = await db.collection('items').doc(id).get()
  if (!doc.data || doc.data._openid !== OPENID) {
    return { success: false, msg: '无权删除该条目' }
  }

  const images = doc.data.images || []
  if (images.length) {
    try {
      await cloud.deleteFile({ fileList: images })
    } catch (e) {
      console.error('删除图片失败', e)
    }
  }

  await db.collection('messages').where({ itemId: id }).remove()
  await db.collection('items').doc(id).remove()

  return { success: true }
}
