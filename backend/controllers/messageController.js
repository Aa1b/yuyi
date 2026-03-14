const pool = require('../config/database');

const MAX_CONTENT_LENGTH = 500;

/**
 * 发送留言
 * POST body: { toUserId, content }
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, content } = req.body;

    if (!toUserId) {
      return res.status(400).json({ code: 400, message: '缺少接收人' });
    }
    const toId = parseInt(toUserId, 10);
    if (!Number.isFinite(toId) || toId < 1) {
      return res.status(400).json({ code: 400, message: '接收人无效' });
    }
    if (toId === fromUserId) {
      return res.status(400).json({ code: 400, message: '不能给自己发留言' });
    }

    const text = (content != null && typeof content === 'string') ? content.trim() : '';
    if (!text) {
      return res.status(400).json({ code: 400, message: '内容不能为空' });
    }
    if (text.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        code: 400,
        message: `内容不能超过${MAX_CONTENT_LENGTH}字`,
      });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [toId]);
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '接收人不存在' });
    }

    const [result] = await pool.execute(
      'INSERT INTO user_messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
      [fromUserId, toId, text]
    );

    const [rows] = await pool.execute(
      `SELECT m.id, m.from_user_id as fromUserId, m.to_user_id as toUserId, m.content, m.is_read as isRead, m.created_at as createdAt
       FROM user_messages m WHERE m.id = ?`,
      [result.insertId]
    );

    const row = rows[0];
    if (row && row.createdAt instanceof Date) {
      row.createdAt = row.createdAt.toISOString();
    }

    res.status(201).json({
      code: 200,
      message: '发送成功',
      data: row,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 与某用户的会话（留言列表）
 * GET query: userId, page, pageSize
 */
exports.getConversation = async (req, res, next) => {
  try {
    const me = req.user.id;
    const otherUserId = parseInt(req.query.userId, 10);
    if (!Number.isFinite(otherUserId) || otherUserId < 1) {
      return res.status(400).json({ code: 400, message: '缺少对方用户ID' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const [messages] = await pool.execute(
      `SELECT m.id, m.from_user_id as fromUserId, m.to_user_id as toUserId, m.content, m.is_read as isRead, m.created_at as createdAt
       FROM user_messages m
       WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
       ORDER BY m.created_at ASC
       LIMIT ? OFFSET ?`,
      [me, otherUserId, otherUserId, me, pageSize, offset]
    );

    // 标记对方发来的未读为已读
    await pool.execute(
      'UPDATE user_messages SET is_read = 1 WHERE to_user_id = ? AND from_user_id = ? AND is_read = 0',
      [me, otherUserId]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM user_messages m
       WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)`,
      [me, otherUserId, otherUserId, me]
    );
    const total = countRows[0].total;

    const list = messages.map((m) => {
      const item = { ...m };
      item.isFromMe = item.fromUserId === me;
      if (item.createdAt instanceof Date) {
        item.createdAt = item.createdAt.toISOString();
      }
      return item;
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total, page, pageSize },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 会话列表（与我发生过留言的用户 + 最后一条内容）
 * GET query: page, pageSize
 */
exports.getConversations = async (req, res, next) => {
  try {
    const me = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute(
      `SELECT 
        u.id as userId,
        u.nickname as userName,
        u.avatar as userAvatar,
        m.content as lastContent,
        m.created_at as lastTime,
        m.from_user_id as lastFromUserId,
        (SELECT COUNT(*) FROM user_messages m2 WHERE m2.to_user_id = ? AND m2.from_user_id = u.id AND m2.is_read = 0) as unreadCount
       FROM (
         SELECT DISTINCT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END as other_user_id,
                MAX(id) as last_id
         FROM user_messages
         WHERE from_user_id = ? OR to_user_id = ?
         GROUP BY other_user_id
       ) t
       JOIN user_messages m ON m.id = t.last_id
       JOIN users u ON u.id = t.other_user_id
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [me, me, me, me, pageSize, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END) as total
       FROM user_messages WHERE from_user_id = ? OR to_user_id = ?`,
      [me, me, me]
    );
    const total = countRows[0].total;

    const list = (rows || []).map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userAvatar: r.userAvatar,
      lastContent: r.lastContent,
      lastTime: r.lastTime instanceof Date ? r.lastTime.toISOString() : r.lastTime,
      lastFromUserId: r.lastFromUserId,
      unreadCount: Number(r.unreadCount) || 0,
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total, page, pageSize },
    });
  } catch (error) {
    next(error);
  }
};
