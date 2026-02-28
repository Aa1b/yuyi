const pool = require('../config/database');

/**
 * 关注用户
 */
exports.follow = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({
        code: 400,
        message: '缺少被关注用户ID',
      });
    }

    if (userId === parseInt(followingId)) {
      return res.status(400).json({
        code: 400,
        message: '不能关注自己',
      });
    }

    // 检查用户是否存在
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [followingId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    // 检查是否已关注
    const [existing] = await pool.execute(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [userId, followingId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '已经关注过了',
      });
    }

    // 添加关注（触发器会自动创建通知）
    await pool.execute(
      'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
      [userId, followingId]
    );

    res.json({
      code: 200,
      message: '关注成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消关注
 */
exports.unfollow = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { followingId } = req.query;

    if (!followingId) {
      return res.status(400).json({
        code: 400,
        message: '缺少被关注用户ID',
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [userId, followingId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        code: 400,
        message: '未关注该用户',
      });
    }

    res.json({
      code: 200,
      message: '取消关注成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取关注列表（支持 userId 查看他人关注的人）
 */
exports.getFollowing = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { page = 1, pageSize = 20, userId } = req.query;
    const targetUserId = userId ? parseInt(userId, 10) : currentUserId;

    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const [follows] = await pool.execute(
      `SELECT 
        u.id,
        u.nickname,
        u.avatar,
        uf.created_at as followAt
      FROM user_follows uf
      LEFT JOIN users u ON uf.following_id = u.id
      WHERE uf.follower_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?`,
      [targetUserId, limit, offset]
    );

    // 若查看他人列表，为每项标记当前用户是否已关注
    if (targetUserId !== currentUserId && follows.length > 0) {
      const ids = follows.map(f => f.id);
      const placeholders = ids.map(() => '?').join(',');
      const [myFollows] = await pool.execute(
        `SELECT following_id FROM user_follows WHERE follower_id = ? AND following_id IN (${placeholders})`,
        [currentUserId, ...ids]
      );
      const followedSet = new Set(myFollows.map(f => f.following_id));
      follows.forEach(f => { f.isFollowing = followedSet.has(f.id); });
    } else if (targetUserId === currentUserId) {
      follows.forEach(f => { f.isFollowing = true; });
    }

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE follower_id = ?',
      [targetUserId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: follows,
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
 * 获取粉丝列表（支持 userId 查看他人的粉丝）
 */
exports.getFollowers = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { page = 1, pageSize = 20, userId } = req.query;
    const targetUserId = userId ? parseInt(userId, 10) : currentUserId;

    const limit = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));
    const offset = Math.max(0, ((parseInt(page, 10) || 1) - 1) * limit);

    const [followers] = await pool.execute(
      `SELECT 
        u.id,
        u.nickname,
        u.avatar,
        uf.created_at as followAt
      FROM user_follows uf
      LEFT JOIN users u ON uf.follower_id = u.id
      WHERE uf.following_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?`,
      [targetUserId, limit, offset]
    );

    // 为每项标记当前用户是否已关注该粉丝（可回关）
    if (followers.length > 0) {
      const ids = followers.map(f => f.id);
      const placeholders = ids.map(() => '?').join(',');
      const [myFollows] = await pool.execute(
        `SELECT following_id FROM user_follows WHERE follower_id = ? AND following_id IN (${placeholders})`,
        [currentUserId, ...ids]
      );
      const followedSet = new Set(myFollows.map(f => f.following_id));
      followers.forEach(f => { f.isFollowing = followedSet.has(f.id); });
    }

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE following_id = ?',
      [targetUserId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: followers,
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
 * 获取用户信息（个人主页）
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id || null;

    if (!userId) {
      return res.status(400).json({
        code: 400,
        message: '缺少用户ID',
      });
    }

    // 查询用户信息
    const [users] = await pool.execute(
      'SELECT id, nickname, avatar, gender, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const user = users[0];

    // 查询统计信息（记录数只统计已发布的，与个人页列表一致）
    const [recordCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM life_records WHERE user_id = ? AND status = 1 AND publish_status = ?',
      [userId, 'published']
    );

    const [followerCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?',
      [userId]
    );

    const [followingCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
      [userId]
    );

    // 获赞数：该用户所有已发布记录的 like_count 之和
    const [likeCountResult] = await pool.execute(
      'SELECT COALESCE(SUM(like_count), 0) as total FROM life_records WHERE user_id = ? AND status = 1 AND publish_status = ?',
      [userId, 'published']
    );
    const likeCount = likeCountResult[0]?.total ?? 0;

    // 查询是否已关注
    let isFollowing = false;
    if (currentUserId && currentUserId !== parseInt(userId)) {
      const [follows] = await pool.execute(
        'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [currentUserId, userId]
      );
      isFollowing = follows.length > 0;
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...user,
        recordCount: recordCount[0].count,
        followerCount: followerCount[0].count,
        followingCount: followingCount[0].count,
        likeCount: Number(likeCount),
        isFollowing,
        isSelf: currentUserId === parseInt(userId),
      },
    });
  } catch (error) {
    next(error);
  }
};
