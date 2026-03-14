const pool = require('../config/database');

const ALLOWED_TYPES = ['all', 'like', 'comment', 'follow'];

/**
 * 安全序列化单条通知（避免 BigInt/Date 导致 JSON 报错）
 */
function serializeNotification(row) {
  if (!row || typeof row !== 'object') return null;
  const createdAt = row.createdAt;
  return {
    id: safeNumber(row.id),
    type: typeof row.type === 'string' ? row.type : null,
    recordId: safeNumber(row.recordId),
    commentId: safeNumber(row.commentId),
    fromUserId: safeNumber(row.fromUserId),
    fromUserName: row.fromUserName != null ? String(row.fromUserName) : null,
    fromUserAvatar: row.fromUserAvatar != null ? String(row.fromUserAvatar) : null,
    content: row.content != null ? String(row.content) : null,
    isRead: safeNumber(row.isRead) ? 1 : 0,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt != null ? String(createdAt) : null),
  };
}

function safeNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 获取通知列表
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ code: 401, message: '用户未登录或无效' });
    }

    let type = (req.query.type || 'all').toLowerCase();
    if (!ALLOWED_TYPES.includes(type)) type = 'all';

    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * pageSize;

    const queryParams = [userId];
    const whereClause = type === 'all' ? 'n.user_id = ?' : 'n.user_id = ? AND n.type = ?';
    if (type !== 'all') queryParams.push(type);

    const [rows] = await pool.execute(
      `SELECT 
        n.id,
        n.type,
        n.record_id as recordId,
        n.comment_id as commentId,
        n.from_user_id as fromUserId,
        u.nickname as fromUserName,
        u.avatar as fromUserAvatar,
        n.content,
        n.is_read as isRead,
        n.created_at as createdAt
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM notifications n WHERE ${whereClause}`,
      queryParams
    );
    const total = Number(countRows[0]?.total) || 0;

    const list = (rows || []).map(serializeNotification).filter(Boolean);

    return res.json({
      code: 200,
      message: '获取成功',
      data: { list, total, page: pageNum, pageSize },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 标记通知为已读
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ code: 401, message: '用户未登录或无效' });
    }
    const id = req.body?.id;

    if (id === 'all') {
      await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    } else if (id != null && id !== '') {
      await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [Number(id), userId]);
    } else {
      return res.status(400).json({ code: 400, message: '缺少通知ID' });
    }

    res.json({ code: 200, message: '标记成功', data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * 获取未读数量
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ code: 401, message: '用户未登录或无效' });
    }
    const [r] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    const count = Number(r[0]?.count) || 0;
    res.json({ code: 200, message: '获取成功', data: { count } });
  } catch (err) {
    next(err);
  }
};

/**
 * 删除通知
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ code: 401, message: '用户未登录或无效' });
    }
    const id = req.query?.id;
    if (id == null || id === '') {
      return res.status(400).json({ code: 400, message: '缺少通知ID' });
    }
    await pool.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [Number(id), userId]);
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    next(err);
  }
};
