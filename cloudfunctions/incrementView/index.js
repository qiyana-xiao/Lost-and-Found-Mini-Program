const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 浏览数原子 +1
exports.main = async (event) => {
  const { id } = event
  if (!id) return { success: false }
  await db
    .collection('items')
    .doc(id)
    .update({ data: { viewCount: _.inc(1) } })
  return { success: true }
}
