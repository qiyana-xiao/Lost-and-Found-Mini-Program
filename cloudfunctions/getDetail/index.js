const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 详情查询：条目 + 留言列表 + 是否发布者
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event
  if (!id) return { item: null, messages: [], isOwner: false }

  const doc = await db.collection('items').doc(id).get()
  const msgRes = await db
    .collection('messages')
    .where({ itemId: id })
    .orderBy('createdAt', 'asc')
    .get()

  return {
    item: doc.data,
    messages: msgRes.data,
    isOwner: !!(doc.data && doc.data._openid === OPENID),
  }
}
