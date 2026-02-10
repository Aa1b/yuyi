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
 * 获取关注列表
 */
exports.getFollowing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

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
      [userId, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE follower_id = ?',
      [userId]
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
 * 获取粉丝列表
 */
exports.getFollowers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

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
      [userId, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE following_id = ?',
      [userId]
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

    // 查询统计信息
    const [recordCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM life_records WHERE user_id = ? AND status = 1',
      [userId]
    );

    const [followerCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?',
      [userId]
    );

    const [followingCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
      [userId]
    );

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
        isFollowing,
        isSelf: currentUserId === parseInt(userId),
      },
    });
  } catch (error) {
    next(error);
  }
};
