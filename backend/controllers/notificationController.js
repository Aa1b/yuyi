const pool = require('../config/database');

/**
 * 获取通知列表
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ code: 401, message: '用户未登录或无效' });
    }
    const { page = 1, pageSize = 20, type = 'all' } = req.query;
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limit;

    let whereCondition = 'n.user_id = ?';
    const queryParams = [userId];
    if (type !== 'all') {
      whereCondition += ' AND n.type = ?';
      queryParams.push(type);
    }

    const [notifications] = await pool.execute(
      `SELECT 
        n.id,
        n.type,
        n.record_id as recordId,
        n.from_user_id as fromUserId,
        u.nickname as fromUserName,
        u.avatar as fromUserAvatar,
        n.content,
        n.is_read as isRead,
        n.created_at as createdAt,
        r.content as recordContent,
        r.type as recordType
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN life_records r ON n.record_id = r.id
      WHERE ${whereCondition}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM notifications n WHERE ${whereCondition}`,
      queryParams
    );
    const total = Number(countResult[0].total);

    const list = (notifications || []).map((row) => {
      const createdAt = row.createdAt;
      return {
        id: row.id != null ? Number(row.id) : null,
        type: row.type || null,
        recordId: row.recordId != null ? Number(row.recordId) : null,
        fromUserId: row.fromUserId != null ? Number(row.fromUserId) : null,
        fromUserName: row.fromUserName ?? null,
        fromUserAvatar: row.fromUserAvatar ?? null,
        content: row.content ?? null,
        isRead: row.isRead != null ? Number(row.isRead) : 0,
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt ?? null),
        recordContent: row.recordContent ?? null,
        recordType: row.recordType ?? null,
      };
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记通知为已读
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.body; // 单个通知ID，或'all'表示全部

    if (id === 'all') {
      // 标记所有通知为已读
      await pool.execute(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [userId]
      );
    } else if (id) {
      // 标记单个通知为已读
      await pool.execute(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId]
      );
    } else {
      return res.status(400).json({
        code: 400,
        message: '缺少通知ID',
      });
    }

    res.json({
      code: 200,
      message: '标记成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取未读通知数量
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    const count = Number(result[0].count);

    res.json({
      code: 200,
      message: '获取成功',
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除通知
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少通知ID',
      });
    }

    await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
