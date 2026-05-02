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
 * 获取关注列表（支持查看他人：传入 userId）
 */
exports.getFollowing = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id != null ? Number(req.user.id) : null;
    if (currentUserId == null || !Number.isInteger(currentUserId)) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }
    const { page = 1, pageSize = 20, userId: targetUserId } = req.query;
    const ownerId = targetUserId ? parseInt(targetUserId, 10) : currentUserId;

    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = Math.max(0, (parseInt(page, 10) || 1) - 1) * limit;
    const limitNum = Math.floor(Number(limit)) || 20;
    const offsetNum = Math.floor(Number(offset)) || 0;

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
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [ownerId]
    );

    if (ownerId !== currentUserId && follows.length > 0) {
      const ids = follows.map((f) => f.id).filter((id) => id != null).join(',');
      if (ids) {
        const [followed] = await pool.execute(
          `SELECT following_id FROM user_follows WHERE follower_id = ? AND following_id IN (${ids})`,
          [currentUserId]
        );
        const followedSet = new Set(followed.map((r) => r.following_id));
        follows.forEach((u) => {
          u.isFollowing = u.id != null && followedSet.has(u.id);
        });
      }
    } else if (ownerId === currentUserId) {
      follows.forEach((u) => {
        u.isFollowing = true;
      });
    }

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE follower_id = ?',
      [ownerId]
    );
    const total = Number(countResult[0]?.total) || 0;

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: follows,
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
 * 获取粉丝列表（支持查看他人：传入 userId）
 */
exports.getFollowers = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id != null ? Number(req.user.id) : null;
    if (currentUserId == null || !Number.isInteger(currentUserId)) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }
    const { page = 1, pageSize = 20, userId: targetUserId } = req.query;
    const ownerId = targetUserId ? parseInt(targetUserId, 10) : currentUserId;

    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = Math.max(0, (parseInt(page, 10) || 1) - 1) * limit;
    const limitNum = Math.floor(Number(limit)) || 20;
    const offsetNum = Math.floor(Number(offset)) || 0;

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
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [ownerId]
    );

    if (followers.length > 0) {
      const ids = followers.map((f) => f.id).filter((id) => id != null).join(',');
      if (ids) {
        const [followed] = await pool.execute(
          `SELECT following_id FROM user_follows WHERE follower_id = ? AND following_id IN (${ids})`,
          [currentUserId]
        );
        const followedSet = new Set(followed.map((r) => r.following_id));
        followers.forEach((u) => {
          u.isFollowing = u.id != null && followedSet.has(u.id);
        });
      }
    }

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_follows WHERE following_id = ?',
      [ownerId]
    );
    const total = Number(countResult[0]?.total) || 0;

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: followers,
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

    // 查询用户信息（生日/地址用于前端星座与所在地；ip_region 为 Ta 最近访问时 IP 解析城市）
    let users;
    try {
      const [rows] = await pool.execute(
        `SELECT id, nickname, avatar, gender,
          DATE_FORMAT(birth, '%Y-%m-%d') AS birth,
          address,
          ip_region,
          created_at
         FROM users WHERE id = ?`,
        [userId]
      );
      users = rows;
    } catch (e) {
      const missingCol = e && (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054);
      if (!missingCol) throw e;
      const [rows] = await pool.execute(
        `SELECT id, nickname, avatar, gender,
          DATE_FORMAT(birth, '%Y-%m-%d') AS birth,
          address,
          created_at
         FROM users WHERE id = ?`,
        [userId]
      );
      users = rows.map((u) => ({ ...u, ip_region: null }));
    }

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const row = users[0];
    const user = {
      id: row.id,
      nickname: row.nickname,
      avatar: row.avatar,
      gender: row.gender,
      birth: row.birth || null,
      address: row.address || null,
      created_at: row.created_at,
      cityFromIp: row.ip_region || null,
    };

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

    const [likeCountResult] = await pool.execute(
      'SELECT COALESCE(SUM(like_count), 0) as count FROM life_records WHERE user_id = ? AND status = 1',
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
        likeCount: likeCountResult[0].count,
        isFollowing,
        isSelf: currentUserId === parseInt(userId),
      },
    });
  } catch (error) {
    next(error);
  }
};
