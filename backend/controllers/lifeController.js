const pool = require('../config/database');
const cache = require('../utils/cache');
const { validateRecordCreate, validateRecordUpdate, validateComment } = require('../utils/validate');

/**
 * 检查用户是否有权限查看记录（基于隐私设置）
 */
const checkRecordPermission = async (recordId, userId = null) => {
  const [records] = await pool.execute(
    'SELECT user_id, privacy FROM life_records WHERE id = ? AND status = 1',
    [recordId]
  );

  if (records.length === 0) {
    return { allowed: false, record: null };
  }

  const record = records[0];

  // 公开记录，所有人都可以查看
  if (record.privacy === 'public') {
    return { allowed: true, record };
  }

  // 私密记录，只有作者可以查看
  if (record.privacy === 'private') {
    if (!userId || record.user_id !== userId) {
      return { allowed: false, record };
    }
    return { allowed: true, record };
  }

  // 好友可见，需要检查关注关系
  if (record.privacy === 'friends') {
    if (!userId) {
      return { allowed: false, record };
    }

    // 作者自己可以查看
    if (record.user_id === userId) {
      return { allowed: true, record };
    }

    // 检查是否互相关注
    const [follows] = await pool.execute(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [userId, record.user_id]
    );

    if (follows.length > 0) {
      return { allowed: true, record };
    }

    return { allowed: false, record };
  }

  return { allowed: false, record };
};

/**
 * 获取生活记录列表
 */
exports.getList = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      category = '',
      privacy = 'public',
      type = 'all',
      userId = null, // 可选：获取指定用户的记录
      location = '', // 可选：按位置关键字筛选
      status = 1, // 可选：状态筛选，1=已发布，pending=待审核，all=已发布+待审核
      sort = 'latest', // 可选：latest=按时间，hot=按点赞数
    } = req.query;

    const currentUserId = req.user?.id || null;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const limit = pageSizeNum;
    const offset = (pageNum - 1) * limit;

    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];

    // 记录状态：仅查询未删除的记录
    whereConditions.push('r.status = 1');

    // 发布状态筛选：使用 publish_status 字段
    if (status === 'all') {
      whereConditions.push("r.publish_status IN ('pending', 'published', 'draft')");
    } else if (status === 'pending') {
      whereConditions.push("r.publish_status = 'pending'");
    } else if (status === 'draft') {
      whereConditions.push("r.publish_status = 'draft'");
    } else {
      // 默认或 status=1：仅已发布
      whereConditions.push("r.publish_status = 'published'");
    }

    // 隐私筛选
    if (privacy === 'public') {
      whereConditions.push('r.privacy = "public"');
    } else if (privacy === 'all' && userId) {
      // 查看指定用户的所有记录（如果是自己或已关注）
      if (parseInt(userId) === currentUserId) {
        // 自己的记录，显示所有
      } else {
        // 他人的记录，只显示公开和好友可见（如果已关注）
        whereConditions.push('(r.privacy = "public" OR (r.privacy = "friends" AND EXISTS (SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = r.user_id)))');
        queryParams.push(currentUserId || 0);
      }
    } else if (privacy === 'all' && !userId && currentUserId) {
      // 默认：当前用户的记录，显示所有
      // 但管理员在审核视角（pending）需要看到所有待审核记录
      if (!(status === 'pending' && req.user && req.user.isAdmin)) {
        whereConditions.push('r.user_id = ?');
        queryParams.push(currentUserId);
      }
    }

    // 用户筛选
    if (userId) {
      whereConditions.push('r.user_id = ?');
      queryParams.push(userId);
    }

    // 分类筛选
    if (category) {
      whereConditions.push('r.category = ?');
      queryParams.push(category);
    }

    // 位置筛选（模糊匹配）
    if (location) {
      whereConditions.push('r.location LIKE ?');
      queryParams.push(`%${location}%`);
    }

    // 类型筛选
    if (type !== 'all') {
      whereConditions.push('r.type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limitNum = Math.floor(Number(limit)) || 10;
    const offsetNum = Math.floor(Number(offset)) || 0;
    const orderBy =
      sort === 'hot'
        ? 'ORDER BY r.like_count DESC, r.created_at DESC'
        : 'ORDER BY r.created_at DESC';

    // 查询记录列表（LIMIT/OFFSET 使用已校验整数拼接，避免预编译参数类型报错）
    const [records] = await pool.execute(
      `SELECT 
        r.id,
        r.user_id as userId,
        u.nickname as userName,
        u.avatar,
        r.title,
        r.content,
        r.type,
        r.privacy,
        r.category,
        r.location,
        r.publish_status as publishStatus,
        r.rejected_reason as rejectedReason,
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt
      FROM life_records r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      queryParams
    );

    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM life_records r ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 查询媒体文件
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

      // 查询标签
      const [tags] = await pool.execute(
        `SELECT rrt.record_id, t.name 
         FROM life_record_tags rrt
         LEFT JOIN life_tags t ON rrt.tag_id = t.id
         WHERE rrt.record_id IN (${placeholders})`,
        recordIds
      );

      // 查询点赞状态（如果已登录）
      let likes = [];
      if (currentUserId) {
        const [likesData] = await pool.execute(
          `SELECT record_id FROM life_likes 
           WHERE record_id IN (${placeholders}) AND user_id = ?`,
          [...recordIds, currentUserId]
        );
        likes = likesData.map(l => l.record_id);
      }

      // 组装数据
      records.forEach(record => {
        record.images = media.filter(m => m.record_id === record.id && m.type === 'image').map(m => m.url);
        const videoMedia = media.find(m => m.record_id === record.id && m.type === 'video');
        record.video = videoMedia ? {
          url: videoMedia.url,
          cover: videoMedia.cover,
          duration: videoMedia.duration,
        } : null;
        record.tags = tags.filter(t => t.record_id === record.id).map(t => t.name);
        record.isLiked = likes.includes(record.id);
      });
    }
    records.forEach(record => {
      if (!Array.isArray(record.images)) record.images = [];
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: records,
        total,
        page: parseInt(page),
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取「赞过的」记录列表（本人或他人个人主页的“我赞过的/他赞过的”）
 * GET /life/liked?page=1&pageSize=10&userId=xxx（userId 不传则取当前用户）
 */
exports.getLikedList = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id || null;
    const { page = 1, pageSize = 10, userId: targetUserId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const limit = pageSizeNum;
    const offset = (pageNum - 1) * limit;

    const ownerId = targetUserId ? parseInt(targetUserId) : currentUserId;
    if (!ownerId) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const isSelf = currentUserId && currentUserId === ownerId;
    const whereConditions = [
      'l.user_id = ?',
      'r.status = 1',
      "r.publish_status = 'published'",
    ];
    const queryParams = [ownerId];

    if (!isSelf) {
      whereConditions.push('r.privacy = "public"');
    } else {
      whereConditions.push('(r.privacy = "public" OR r.privacy = "private" OR r.privacy = "friends")');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    const [rows] = await pool.execute(
      `SELECT 
        r.id,
        r.user_id as userId,
        u.nickname as userName,
        u.avatar,
        r.title,
        r.content,
        r.type,
        r.privacy,
        r.category,
        r.location,
        r.publish_status as publishStatus,
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt
      FROM life_likes l
      INNER JOIN life_records r ON l.record_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM life_likes l
       INNER JOIN life_records r ON l.record_id = r.id
       ${whereClause}`,
      queryParams
    );
    const total = Number(countRows[0]?.total) || 0;
    const records = rows || [];

    const recordIds = records.map((r) => r.id);
    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => '?').join(',');
      const [media] = await pool.execute(
        `SELECT record_id, media_type as type, url, thumbnail_url as cover, duration
         FROM life_media WHERE record_id IN (${placeholders}) ORDER BY sort_order, id`,
        recordIds
      );
      const [tags] = await pool.execute(
        `SELECT rrt.record_id, t.name FROM life_record_tags rrt
         LEFT JOIN life_tags t ON rrt.tag_id = t.id
         WHERE rrt.record_id IN (${placeholders})`,
        recordIds
      );
      let likes = [];
      if (currentUserId) {
        const [likesData] = await pool.execute(
          `SELECT record_id FROM life_likes WHERE record_id IN (${placeholders}) AND user_id = ?`,
          [...recordIds, currentUserId]
        );
        likes = likesData.map((l) => l.record_id);
      }
      records.forEach((record) => {
        record.images = media.filter((m) => m.record_id === record.id && m.type === 'image').map((m) => m.url);
        const videoMedia = media.find((m) => m.record_id === record.id && m.type === 'video');
        record.video = videoMedia ? { url: videoMedia.url, cover: videoMedia.cover, duration: videoMedia.duration } : null;
        record.tags = tags.filter((t) => t.record_id === record.id).map((t) => t.name);
        record.isLiked = likes.includes(record.id);
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: records, total, page: pageNum, pageSize: limit },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取生活记录详情
 */
exports.getDetail = async (req, res, next) => {
  try {
    const { id } = req.query;
    const currentUserId = req.user?.id || null;

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    // 检查权限
    const permission = await checkRecordPermission(id, currentUserId);
    if (!permission.allowed) {
      return res.status(403).json({
        code: 403,
        message: '无权访问此记录',
      });
    }

    // 查询记录详情
    const [records] = await pool.execute(
      `SELECT 
        r.id,
        r.user_id as userId,
        u.nickname as userName,
        u.avatar,
        r.title,
        r.content,
        r.type,
        r.privacy,
        r.category,
        r.location,
        r.publish_status as publishStatus,
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt
      FROM life_records r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ? AND r.status = 1`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    const record = records[0];

    // 查询媒体文件
    const [media] = await pool.execute(
      `SELECT media_type as type, url, thumbnail_url as cover, duration 
       FROM life_media 
       WHERE record_id = ? 
       ORDER BY sort_order, id`,
      [id]
    );

    record.images = media.filter(m => m.type === 'image').map(m => m.url);
    const videoMedia = media.find(m => m.type === 'video');
    record.video = videoMedia ? {
      url: videoMedia.url,
      cover: videoMedia.cover,
      duration: videoMedia.duration,
    } : null;

    // 查询标签
    const [tags] = await pool.execute(
      `SELECT t.name 
       FROM life_record_tags rrt
       LEFT JOIN life_tags t ON rrt.tag_id = t.id
       WHERE rrt.record_id = ?`,
      [id]
    );
    record.tags = tags.map(t => t.name);

    // 查询点赞状态
    if (currentUserId) {
      const [likes] = await pool.execute(
        'SELECT id FROM life_likes WHERE record_id = ? AND user_id = ?',
        [id, currentUserId]
      );
      record.isLiked = likes.length > 0;
    } else {
      record.isLiked = false;
    }

    // 查询评论（楼中楼：顶级 + 回复）
    const [topComments] = await pool.execute(
      `SELECT 
        c.id,
        c.user_id as userId,
        u.nickname as userName,
        u.avatar,
        c.content,
        c.parent_id as parentId,
        c.created_at as createdAt
      FROM life_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.record_id = ? AND c.status = 1 AND c.parent_id = 0
      ORDER BY c.created_at ASC`,
      [id]
    );

    if (topComments.length > 0) {
      const topIds = topComments.map((c) => c.id);
      const placeholders = topIds.map(() => '?').join(',');
      const [replies] = await pool.execute(
        `SELECT 
          c.id,
          c.user_id as userId,
          u.nickname as userName,
          u.avatar,
          c.content,
          c.parent_id as parentId,
          c.created_at as createdAt
        FROM life_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.record_id = ? AND c.status = 1 AND c.parent_id IN (${placeholders})
        ORDER BY c.created_at ASC`,
        [id, ...topIds]
      );

      const topMap = {};
      topComments.forEach((c) => {
        topMap[c.id] = { ...c, replies: [] };
      });
      replies.forEach((r) => {
        const parent = topMap[r.parentId];
        if (parent) {
          parent.replies.push({
            ...r,
            replyToUserName: parent.userName,
          });
        }
      });
      record.comments = topComments.map((c) => topMap[c.id]);
    } else {
      record.comments = [];
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建生活记录（支持标题、草稿/待审核/直接发布）
 */
exports.createRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      content,
      type,
      privacy,
      category,
      tags,
      location,
      images,
      video,
      publishStatus: bodyPublishStatus,
    } = req.body;

    const err = validateRecordCreate(req.body);
    if (err) return res.status(400).json(err);

    const hasTitle = title != null && String(title).trim() !== '';
    const hasContent = content != null && String(content).trim() !== '';
    if (!hasTitle && !hasContent) {
      return res.status(400).json({
        code: 400,
        message: '请填写标题或内容',
      });
    }
    if (!type) {
      return res.status(400).json({
        code: 400,
        message: '类型不能为空',
      });
    }

    if (!['image', 'video'].includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '类型必须是 image 或 video',
      });
    }

    if (privacy && !['public', 'private', 'friends'].includes(privacy)) {
      return res.status(400).json({
        code: 400,
        message: '隐私设置无效',
      });
    }

    const publishStatus =
      bodyPublishStatus === 'draft' || bodyPublishStatus === 'pending' || bodyPublishStatus === 'published'
        ? bodyPublishStatus
        : 'pending';

    const [result] = await pool.execute(
      `INSERT INTO life_records 
       (user_id, title, content, type, privacy, category, location, status, publish_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        hasTitle ? String(title).trim() : '',
        content != null ? String(content).trim() : '',
        type,
        privacy || 'public',
        category || null,
        location || null,
        1,
        publishStatus,
      ]
    );

    const recordId = result.insertId;

    // 保存媒体文件
    if (type === 'image' && images && images.length > 0) {
      const mediaValues = images.map((url, index) => [recordId, 'image', url, null, null, index]);
      await pool.query(
        `INSERT INTO life_media (record_id, media_type, url, thumbnail_url, duration, sort_order) VALUES ?`,
        [mediaValues]
      );
    } else if (type === 'video' && video) {
      await pool.execute(
        `INSERT INTO life_media 
         (record_id, media_type, url, thumbnail_url, duration) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          recordId,
          'video',
          video.url,
          video.cover || null,
          video.duration || null,
        ]
      );
    }

    // 保存标签
    if (tags && tags.length > 0) {
      // 先确保标签存在
      for (const tagName of tags) {
        const [existing] = await pool.execute(
          'SELECT id FROM life_tags WHERE name = ?',
          [tagName]
        );

        let tagId;
        if (existing.length === 0) {
          const [tagResult] = await pool.execute(
            'INSERT INTO life_tags (name) VALUES (?)',
            [tagName]
          );
          tagId = tagResult.insertId;
        } else {
          tagId = existing[0].id;
        }

        // 关联标签
        await pool.execute(
          'INSERT INTO life_record_tags (record_id, tag_id) VALUES (?, ?)',
          [recordId, tagId]
        );
      }
    }

    res.status(201).json({
      code: 200,
      message: '发布成功',
      data: {
        id: recordId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新生活记录
 */
exports.updateRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, content, privacy, category, tags, location } = req.body;

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    // 检查记录是否存在且属于当前用户
    const [records] = await pool.execute(
      'SELECT user_id FROM life_records WHERE id = ? AND status = 1',
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    if (records[0].user_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权修改此记录',
      });
    }

    const err = validateRecordUpdate(req.body);
    if (err) return res.status(400).json(err);

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(String(content).trim());
    }
    if (privacy !== undefined) {
      updateFields.push('privacy = ?');
      updateValues.push(privacy);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category != null ? String(category).trim() || null : null);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location != null ? String(location).trim() || null : null);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await pool.execute(
        `UPDATE life_records SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // 更新标签
    if (tags !== undefined) {
      // 删除原有标签
      await pool.execute(
        'DELETE FROM life_record_tags WHERE record_id = ?',
        [id]
      );

      // 添加新标签
      if (tags.length > 0) {
        for (const tagName of tags) {
          const [existing] = await pool.execute(
            'SELECT id FROM life_tags WHERE name = ?',
            [tagName]
          );

          let tagId;
          if (existing.length === 0) {
            const [tagResult] = await pool.execute(
              'INSERT INTO life_tags (name) VALUES (?)',
              [tagName]
            );
            tagId = tagResult.insertId;
          } else {
            tagId = existing[0].id;
          }

          await pool.execute(
            'INSERT INTO life_record_tags (record_id, tag_id) VALUES (?, ?)',
            [id, tagId]
          );
        }
      }
    }

    res.json({
      code: 200,
      message: '更新成功',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除生活记录
 */
exports.deleteRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    // 检查记录是否存在且属于当前用户
    const [records] = await pool.execute(
      'SELECT user_id FROM life_records WHERE id = ?',
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    if (records[0].user_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此记录',
      });
    }

    // 软删除（更新状态）
    await pool.execute(
      'UPDATE life_records SET status = 0 WHERE id = ?',
      [id]
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

/**
 * 审核生活记录（通过 / 驳回）
 */
exports.reviewRecord = async (req, res, next) => {
  try {
    const { id, action, reason } = req.body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        code: 400,
        message: '参数错误',
      });
    }

    // 管理员权限已由 requireAdmin 中间件校验
    const publishStatus = action === 'approve' ? 'published' : 'draft';
    const rejectedReason = action === 'reject' ? (reason || '不符合发布要求') : null;

    const [result] = await pool.execute(
      'UPDATE life_records SET publish_status = ?, rejected_reason = ? WHERE id = ?',
      [publishStatus, rejectedReason, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    res.json({
      code: 200,
      message: action === 'approve' ? '审核通过' : '已驳回',
      data: {
        id,
        publishStatus,
        rejectedReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞
 */
exports.like = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    // 检查记录是否存在
    const [records] = await pool.execute(
      "SELECT id FROM life_records WHERE id = ? AND status = 1 AND publish_status = 'published'",
      [recordId]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    // 检查是否已点赞
    const [existing] = await pool.execute(
      'SELECT id FROM life_likes WHERE record_id = ? AND user_id = ?',
      [recordId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '已经点赞过了',
      });
    }

    // 添加点赞（触发器会自动更新点赞数和创建通知）
    await pool.execute(
      'INSERT INTO life_likes (record_id, user_id) VALUES (?, ?)',
      [recordId, userId]
    );

    // 查询更新后的点赞数
    const [countResult] = await pool.execute(
      'SELECT like_count as likeCount FROM life_records WHERE id = ?',
      [recordId]
    );

    res.json({
      code: 200,
      message: '点赞成功',
      data: {
        likeCount: countResult[0].likeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消点赞
 */
exports.unlike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recordId } = req.query;

    if (!recordId) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    // 删除点赞（触发器会自动更新点赞数）
    const [result] = await pool.execute(
      'DELETE FROM life_likes WHERE record_id = ? AND user_id = ?',
      [recordId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        code: 400,
        message: '未点赞',
      });
    }

    // 查询更新后的点赞数
    const [countResult] = await pool.execute(
      'SELECT like_count as likeCount FROM life_records WHERE id = ?',
      [recordId]
    );

    res.json({
      code: 200,
      message: '取消点赞成功',
      data: {
        likeCount: countResult[0].likeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我赞过的生活记录列表
 */
exports.getLikedList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const limitNum = Math.floor(Number(pageSizeNum)) || 10;
    const offsetNum = Math.floor(Number((pageNum - 1) * pageSizeNum)) || 0;

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
        r.publish_status as publishStatus,
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt
      FROM life_likes lk
      INNER JOIN life_records r ON lk.record_id = r.id AND r.status = 1 AND r.publish_status = 'published'
      LEFT JOIN users u ON r.user_id = u.id
      WHERE lk.user_id = ?
      ORDER BY lk.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM life_likes lk
       INNER JOIN life_records r ON lk.record_id = r.id AND r.status = 1 AND r.publish_status = 'published'
       WHERE lk.user_id = ?`,
      [userId]
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
        record.video = videoMedia ? {
          url: videoMedia.url,
          cover: videoMedia.cover,
          duration: videoMedia.duration,
        } : null;
        record.tags = tags.filter(t => t.record_id === record.id).map(t => t.name);
        record.isLiked = true;
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: records,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取评论列表
 */
exports.getComments = async (req, res, next) => {
  try {
    const { recordId, page = 1, pageSize = 10 } = req.query;

    if (!recordId) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
      });
    }

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    const [comments] = await pool.execute(
      `SELECT 
        c.id,
        c.user_id as userId,
        u.nickname as userName,
        u.avatar,
        c.content,
        c.created_at as createdAt
      FROM life_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.record_id = ? AND c.status = 1 AND c.parent_id = 0
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?`,
      [recordId, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM life_comments WHERE record_id = ? AND status = 1 AND parent_id = 0',
      [recordId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: comments,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发表评论
 */
exports.createComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recordId, content, parentId } = req.body;

    if (!recordId) {
      return res.status(400).json({
        code: 400,
        message: '记录ID不能为空',
      });
    }

    const err = validateComment(req.body);
    if (err) return res.status(400).json(err);

    const contentTrimmed = String(content).trim();
    const parentIdNum = parentId != null ? parseInt(parentId, 10) : 0;

    // 检查记录是否存在
    const [records] = await pool.execute(
      "SELECT id FROM life_records WHERE id = ? AND status = 1 AND publish_status = 'published'",
      [recordId]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    // 若有 parentId，校验父评论存在且属于该记录
    let parentCommentUserId = null;
    if (parentIdNum > 0) {
      const [parentRows] = await pool.execute(
        'SELECT user_id FROM life_comments WHERE id = ? AND record_id = ? AND status = 1',
        [parentIdNum, recordId]
      );
      if (parentRows.length === 0) {
        return res.status(400).json({ code: 400, message: '父评论不存在' });
      }
      parentCommentUserId = parentRows[0].user_id;
    }

    // 创建评论（触发器仅对 parent_id=0 更新评论数和发通知给记录作者）
    const [result] = await pool.execute(
      'INSERT INTO life_comments (record_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [recordId, userId, contentTrimmed, parentIdNum]
    );

    const newCommentId = result.insertId;

    // 回复时：给被回复人发一条「xxx 回复了你的评论」通知（类型 comment，与现有逻辑共用）
    if (parentIdNum > 0 && parentCommentUserId && parentCommentUserId !== userId) {
      const [fromUser] = await pool.execute(
        'SELECT nickname FROM users WHERE id = ?',
        [userId]
      );
      const fromName = (fromUser[0] && fromUser[0].nickname) || '有人';
      await pool.execute(
        `INSERT INTO notifications (user_id, type, record_id, from_user_id, content, comment_id)
         VALUES (?, 'comment', ?, ?, ?, ?)`,
        [parentCommentUserId, recordId, userId, `${fromName} 回复了你的评论`, newCommentId]
      );
    }

    // 查询评论详情（含 parent_id 供前端区分）
    const [comments] = await pool.execute(
      `SELECT 
        c.id,
        c.user_id as userId,
        u.nickname as userName,
        u.avatar,
        c.content,
        c.parent_id as parentId,
        c.created_at as createdAt
      FROM life_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [newCommentId]
    );

    res.status(201).json({
      code: 200,
      message: '评论成功',
      data: comments[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取分类列表
 */
exports.getCategories = async (req, res, next) => {
  try {
    const cacheKey = 'life_categories';
    const defaultCategories = ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'];
    
    // 尝试从缓存获取
    let categoryList = cache.get(cacheKey);
    
    if (!categoryList) {
      // 从数据库查询已有分类
      const [categories] = await pool.execute(
        'SELECT DISTINCT category FROM life_records WHERE category IS NOT NULL AND status = 1 ORDER BY category'
      );

      const dbCategories = categories
        .map(c => c.category)
        .filter(name => typeof name === 'string' && name.trim());

      // 使用「默认分类 + 数据库中出现过的分类」去重合并，确保默认项始终存在
      const mergedSet = new Set([
        ...defaultCategories,
        ...dbCategories,
      ]);
      categoryList = Array.from(mergedSet);
      
      // 缓存10分钟
      cache.set(cacheKey, categoryList, 10 * 60 * 1000);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: categoryList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取标签列表（热门标签）
 */
exports.getTags = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const cacheKey = `life_tags_${limit}`;
    
    // 尝试从缓存获取
    let tagList = cache.get(cacheKey);
    
    if (!tagList) {
      // 从数据库查询
      const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
      const [tags] = await pool.execute(
        `SELECT name, count FROM life_tags WHERE count > 0 ORDER BY count DESC, name ASC LIMIT ${limitNum}`
      );

      tagList = tags.map(t => ({
        name: t.name,
        count: t.count,
      }));
      
      // 缓存5分钟
      cache.set(cacheKey, tagList, 5 * 60 * 1000);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: tagList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 搜索生活记录
 */
exports.search = async (req, res, next) => {
  try {
    const {
      keyword = '',
      page = 1,
      pageSize = 10,
      category = '',
      type = 'all',
    } = req.query;

    const currentUserId = req.user?.id || null;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    if (!keyword.trim()) {
      return res.status(400).json({
        code: 400,
        message: '搜索关键词不能为空',
      });
    }

    // 构建查询条件
    let whereConditions = ['r.status = 1', 'r.privacy = "public"'];
    const queryParams = [];

    // 关键词搜索（内容、标签）
    if (keyword) {
      whereConditions.push(
        '(r.content LIKE ? OR EXISTS (SELECT 1 FROM life_record_tags rrt LEFT JOIN life_tags t ON rrt.tag_id = t.id WHERE rrt.record_id = r.id AND t.name LIKE ?))'
      );
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern);
    }

    // 分类筛选
    if (category) {
      whereConditions.push('r.category = ?');
      queryParams.push(category);
    }

    // 类型筛选
    if (type !== 'all') {
      whereConditions.push('r.type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询记录列表
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
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt
      FROM life_records r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM life_records r ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 查询媒体文件
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

      // 查询标签
      const [tags] = await pool.execute(
        `SELECT rrt.record_id, t.name 
         FROM life_record_tags rrt
         LEFT JOIN life_tags t ON rrt.tag_id = t.id
         WHERE rrt.record_id IN (${placeholders})`,
        recordIds
      );

      // 查询点赞状态（如果已登录）
      let likes = [];
      if (currentUserId) {
        const [likesData] = await pool.execute(
          `SELECT record_id FROM life_likes 
           WHERE record_id IN (${placeholders}) AND user_id = ?`,
          [...recordIds, currentUserId]
        );
        likes = likesData.map(l => l.record_id);
      }

      // 组装数据
      records.forEach(record => {
        record.images = media.filter(m => m.record_id === record.id && m.type === 'image').map(m => m.url);
        const videoMedia = media.find(m => m.record_id === record.id && m.type === 'video');
        record.video = videoMedia ? {
          url: videoMedia.url,
          cover: videoMedia.cover,
          duration: videoMedia.duration,
        } : null;
        record.tags = tags.filter(t => t.record_id === record.id).map(t => t.name);
        record.isLiked = likes.includes(record.id);
      });
    }

    res.json({
      code: 200,
      message: '搜索成功',
      data: {
        list: records,
        total,
        page: parseInt(page),
        pageSize: limit,
        keyword,
      },
    });
  } catch (error) {
    next(error);
  }
};
