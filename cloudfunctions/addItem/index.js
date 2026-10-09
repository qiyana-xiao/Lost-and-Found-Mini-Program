const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 新增 / 编辑条目：校验必填 + 发布频率限制（同用户 1 分钟最多 3 条）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    id,
    type,
    title,
    category,
    description,
    location,
    happenTime,
    images,
    contact,
  } = event

  if (!type || !['lost', 'found'].includes(type)) {
    return { success: false, msg: '类型不正确' }
  }
  if (!title || !title.trim()) return { success: false, msg: '请填写标题' }
  if (!category) return { success: false, msg: '请选择分类' }
  if (!location || !location.trim()) return { success: false, msg: '请填写地点' }
  if (!contact || !contact.trim()) return { success: false, msg: '请填写联系方式' }

  // 防刷：同一用户近 1 分钟内新增不得超过 3 条
  if (!id) {
    const oneMinAgo = Date.now() - 60 * 1000
    const recent = await db
      .collection('items')
      .where({ _openid: OPENID, createdAt: _.gte(oneMinAgo) })
      .count()
    if (recent.total >= 3) {
      return { success: false, msg: '发布过于频繁，请稍后再试' }
    }
  }

  const data = {
    type,
    title: title.trim(),
    category,
    description: (description || '').trim(),
    location: location.trim(),
    happenTime: happenTime || '',
    images: images || [],
    contact: contact.trim(),
  }

  if (id) {
    const doc = await db.collection('items').doc(id).get()
    if (!doc.data || doc.data._openid !== OPENID) {
      return { success: false, msg: '无权编辑该条目' }
    }
    await db.collection('items').doc(id).update({
      data: { ...data, updatedAt: Date.now() },
    })
    return { success: true, id }
  }

  const res = await db.collection('items').add({
    data: {
      ...data,
      _openid: OPENID,
      status: 'open',
      viewCount: 0,
      createdAt: Date.now(),
    },
  })
  return { success: true, id: res._id }
}
