const pool = require('../config/database');

/**
 * 获取待审核记录列表（仅管理员）
 */
exports.getPendingRecords = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const [records] = await pool.execute(
      `SELECT 
        r.id,
        r.user_id as userId,
        u.nickname as userName,
        u.avatar,
        r.content,
        r.type,
        r.privacy,
        r.category,
        r.location,
        r.created_at as createdAt,
        r.publish_status as publishStatus
      FROM life_records r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status = 1 AND r.publish_status = 'pending'
      ORDER BY r.created_at ASC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await pool.execute(
      "SELECT COUNT(*) as total FROM life_records WHERE status = 1 AND publish_status = 'pending'"
    );
    const total = countResult[0].total;

    const recordIds = records.map(r => r.id);
    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => '?').join(',');
      const [media] = await pool.execute(
        `SELECT record_id, media_type as type, url, thumbnail_url as cover, duration 
         FROM life_media 
         WHERE record_id IN (${placeholders}) 
         ORDER BY sort_order, id`,
        recordIds
      );
      const [tags] = await pool.execute(
        `SELECT rrt.record_id, t.name 
         FROM life_record_tags rrt
         LEFT JOIN life_tags t ON rrt.tag_id = t.id
         WHERE rrt.record_id IN (${placeholders})`,
        recordIds
      );
      records.forEach(record => {
        record.images = media.filter(m => m.record_id === record.id && m.type === 'image').map(m => m.url);
        const videoMedia = media.find(m => m.record_id === record.id && m.type === 'video');
        record.video = videoMedia ? { url: videoMedia.url, cover: videoMedia.cover, duration: videoMedia.duration } : null;
        record.tags = tags.filter(t => t.record_id === record.id).map(t => t.name);
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: records,
        total,
        page: parseInt(page, 10) || 1,
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 审核通过（仅管理员）
 */
exports.approveRecord = async (req, res, next) => {
  try {
    const recordId = req.params.id;
    if (!recordId) {
      return res.status(400).json({ code: 400, message: '缺少记录ID' });
    }

    const [rows] = await pool.execute(
      'SELECT id FROM life_records WHERE id = ? AND status = 1 AND publish_status = ?',
      [recordId, 'pending']
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '待审核记录不存在或已处理' });
    }

    await pool.execute(
      'UPDATE life_records SET publish_status = ?, rejected_reason = NULL WHERE id = ?',
      ['published', recordId]
    );

    res.json({
      code: 200,
      message: '已通过，该记录已对外展示',
      data: { id: parseInt(recordId, 10) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 审核驳回（仅管理员）
 */
exports.rejectRecord = async (req, res, next) => {
  try {
    const recordId = req.params.id;
    const { reason } = req.body || {};
    if (!recordId) {
      return res.status(400).json({ code: 400, message: '缺少记录ID' });
    }

    const [rows] = await pool.execute(
      'SELECT id FROM life_records WHERE id = ? AND status = 1 AND publish_status = ?',
      [recordId, 'pending']
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '待审核记录不存在或已处理' });
    }

    const rejectReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';

    await pool.execute(
      'UPDATE life_records SET publish_status = ?, rejected_reason = ? WHERE id = ?',
      ['rejected', rejectReason || null, recordId]
    );

    res.json({
      code: 200,
      message: '已驳回',
      data: { id: parseInt(recordId, 10), rejectedReason: rejectReason || null },
    });
  } catch (error) {
    next(error);
  }
};
