const pool = require('../config/database');
const cache = require('../utils/cache');

/**
 * 检查用户是否有权限查看记录（基于隐私设置）
 */
const checkRecordPermission = async (recordId, userId = null) => {
  const [records] = await pool.execute(
    'SELECT user_id, privacy, publish_status FROM life_records WHERE id = ? AND status = 1',
    [recordId]
  );

  if (records.length === 0) {
    return { allowed: false, record: null };
  }

  const record = records[0];
  const pubStatus = record.publish_status;

  // 草稿或审核中：仅作者本人可查看
  if (pubStatus === 'draft' || pubStatus === 'pending') {
    if (!userId || record.user_id !== userId) {
      return { allowed: false, record };
    }
    return { allowed: true, record };
  }

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
      publishStatus = 'all', // 我的记录筛选：all | draft | pending | published
    } = req.query;

    const currentUserId = req.user?.id || null;
    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    // 构建查询条件
    let whereConditions = ['r.status = 1'];
    const queryParams = [];

    // 隐私筛选
    if (privacy === 'public') {
      whereConditions.push('r.privacy = ?');
      queryParams.push('public');
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
      // 当前用户的记录，显示所有
      whereConditions.push('r.user_id = ?');
      queryParams.push(currentUserId);
    }

    // 用户筛选
    if (userId) {
      whereConditions.push('r.user_id = ?');
      queryParams.push(userId);
    }

    // 发布状态筛选（仅在自己的记录列表时生效）
    const isMyList = (privacy === 'all' && !userId && currentUserId) || (userId && parseInt(userId) === currentUserId);
    if (isMyList && publishStatus && publishStatus !== 'all') {
      whereConditions.push('r.publish_status = ?');
      queryParams.push(publishStatus);
    } else if (!isMyList) {
      whereConditions.push('r.publish_status = ?');
      queryParams.push('published');
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
    const listParams = [...queryParams, limit, offset];
    let records;
    let total;
    try {
      const [rows] = await pool.execute(
        `SELECT r.id, r.user_id as userId, u.nickname as userName, u.avatar, r.content, r.type, r.privacy, r.category, r.location, r.like_count as likeCount, r.comment_count as commentCount, r.created_at as createdAt, r.publish_status as publishStatus FROM life_records r LEFT JOIN users u ON r.user_id = u.id ${whereClause} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
        listParams
      );
      records = rows;
      const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM life_records r ${whereClause}`, queryParams);
      total = countResult[0].total;
    } catch (listErr) {
      const errMsg = String(listErr?.message || listErr?.sqlMessage || '');
      if (errMsg.includes('publish_status')) {
        const whereNoPub = whereConditions.filter(c => !c.includes('publish_status'));
        const whereFallback = whereNoPub.length ? `WHERE ${whereNoPub.join(' AND ')}` : '';
        const paramsFallback = queryParams.filter((_, idx) => !whereConditions[idx].includes('publish_status'));
        const [rows] = await pool.execute(
          `SELECT r.id, r.user_id as userId, u.nickname as userName, u.avatar, r.content, r.type, r.privacy, r.category, r.location, r.like_count as likeCount, r.comment_count as commentCount, r.created_at as createdAt FROM life_records r LEFT JOIN users u ON r.user_id = u.id ${whereFallback} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
          [...paramsFallback, limit, offset]
        );
        records = rows.map(r => ({ ...r, publishStatus: 'published' }));
        const [cr] = await pool.execute(`SELECT COUNT(*) as total FROM life_records r ${whereFallback}`, paramsFallback);
        total = cr[0].total;
      } else {
        throw listErr;
      }
    }

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
        r.content,
        r.type,
        r.privacy,
        r.category,
        r.location,
        r.like_count as likeCount,
        r.comment_count as commentCount,
        r.created_at as createdAt,
        r.publish_status as publishStatus
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

    // 查询评论
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
      ORDER BY c.created_at ASC`,
      [id]
    );
    record.comments = comments;

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
 * 创建生活记录
 */
exports.createRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { content, type, privacy, category, tags, location, images, video, publishStatus } = req.body;

    if (!content || !type) {
      return res.status(400).json({
        code: 400,
        message: '内容和类型不能为空',
      });
    }

    // 验证类型
    if (!['image', 'video'].includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '类型必须是 image 或 video',
      });
    }

    // 验证隐私设置
    if (privacy && !['public', 'private', 'friends'].includes(privacy)) {
      return res.status(400).json({
        code: 400,
        message: '隐私设置无效',
      });
    }

    const pubStatus = ['draft', 'pending', 'published'].includes(publishStatus) ? publishStatus : 'published';

    // 创建记录
    const [result] = await pool.execute(
      `INSERT INTO life_records 
       (user_id, content, type, privacy, category, location, publish_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        content,
        type,
        privacy || 'public',
        category || null,
        location || null,
        pubStatus,
      ]
    );

    const recordId = result.insertId;

    // 保存媒体文件
    if (type === 'image' && images && images.length > 0) {
      const mediaValues = images.map((url, index) => [recordId, 'image', url, null, null, index]);
      await pool.query(
        `INSERT INTO life_media (record_id, media_type, url, sort_order) VALUES ?`,
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
    const { id, content, privacy, category, tags, location, publishStatus } = req.body;

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

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (privacy !== undefined) {
      updateFields.push('privacy = ?');
      updateValues.push(privacy);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category || null);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location || null);
    }
    if (publishStatus !== undefined && ['draft', 'pending', 'published'].includes(publishStatus)) {
      updateFields.push('publish_status = ?');
      updateValues.push(publishStatus);
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
      'SELECT id FROM life_records WHERE id = ? AND status = 1',
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
    const { recordId, content } = req.body;

    if (!recordId || !content) {
      return res.status(400).json({
        code: 400,
        message: '记录ID和评论内容不能为空',
      });
    }

    // 检查记录是否存在
    const [records] = await pool.execute(
      'SELECT id FROM life_records WHERE id = ? AND status = 1',
      [recordId]
    );

    if (records.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
      });
    }

    // 创建评论（触发器会自动更新评论数和创建通知）
    const [result] = await pool.execute(
      'INSERT INTO life_comments (record_id, user_id, content) VALUES (?, ?, ?)',
      [recordId, userId, content]
    );

    // 查询评论详情
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
      WHERE c.id = ?`,
      [result.insertId]
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
    
    // 尝试从缓存获取
    let categoryList = cache.get(cacheKey);
    
    if (!categoryList) {
      // 从数据库查询
      const [categories] = await pool.execute(
        'SELECT DISTINCT category FROM life_records WHERE category IS NOT NULL AND status = 1 ORDER BY category'
      );

      categoryList = categories.map(c => c.category);
      
      // 如果数据库没有数据，使用默认分类
      if (categoryList.length === 0) {
        categoryList = ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'];
      }
      
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
      const [tags] = await pool.execute(
        'SELECT name, count FROM life_tags WHERE count > 0 ORDER BY count DESC, name ASC LIMIT ?',
        [parseInt(limit)]
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
    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    if (!keyword.trim()) {
      return res.status(400).json({
        code: 400,
        message: '搜索关键词不能为空',
      });
    }

    // 构建查询条件（搜索只展示已发布，使用参数避免占位符数量错误）
    let whereConditions = ['r.status = 1', 'r.privacy = ?', 'r.publish_status = ?'];
    const queryParams = ['public', 'published'];

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
        r.created_at as createdAt,
        r.publish_status as publishStatus
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
