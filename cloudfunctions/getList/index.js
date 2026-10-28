const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 列表查询：支持 type / category / keyword / 仅看自己 过滤，分页按 createdAt 倒序
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    type,
    category,
    keyword,
    mine,
    page = 0,
    pageSize = 20,
  } = event

  const where = {}
  if (type) where.type = type
  if (category) where.category = category
  if (mine) where._openid = OPENID
  if (keyword) {
    where.title = db.RegExp({ regexp: keyword, options: 'i' })
  }

  const countRes = await db.collection('items').where(where).count()
  const res = await db
    .collection('items')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip(page * pageSize)
    .limit(pageSize)
    .get()

  return { list: res.data, total: countRes.total }
}
