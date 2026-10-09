const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 标记已认领（仅发布者）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event
  if (!id) return { success: false, msg: '缺少 id' }

  const doc = await db.collection('items').doc(id).get()
  if (!doc.data || doc.data._openid !== OPENID) {
    return { success: false, msg: '无权操作' }
  }
  await db
    .collection('items')
    .doc(id)
    .update({ data: { status: 'closed', updatedAt: Date.now() } })
  return { success: true }
}
