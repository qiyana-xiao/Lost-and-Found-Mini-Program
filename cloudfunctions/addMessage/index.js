const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 新增认领留言
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { itemId, content, contact } = event
  if (!itemId || !content || !content.trim()) {
    return { success: false, msg: '请输入留言内容' }
  }
  const res = await db.collection('messages').add({
    data: {
      itemId,
      content: content.trim(),
      contact: (contact || '').trim(),
      _openid: OPENID,
      createdAt: Date.now(),
    },
  })
  return { success: true, id: res._id }
}
