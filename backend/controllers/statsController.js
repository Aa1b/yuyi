const pool = require('../config/database');

/**
 * 数据中心概览（仅管理员）
 * 返回：用户数、记录数（已发布/待审核/草稿）、点赞数、评论数
 */
exports.getOverview = async (req, res, next) => {
  try {
    const [[userCount]] = await pool.execute(
      'SELECT COUNT(*) as c FROM users'
    );
    const [[recordTotal]] = await pool.execute(
      'SELECT COUNT(*) as c FROM life_records WHERE status = 1'
    );
    const [[publishedCount]] = await pool.execute(
      "SELECT COUNT(*) as c FROM life_records WHERE status = 1 AND publish_status = 'published'"
    );
    const [[pendingCount]] = await pool.execute(
      "SELECT COUNT(*) as c FROM life_records WHERE status = 1 AND publish_status = 'pending'"
    );
    const [[draftCount]] = await pool.execute(
      "SELECT COUNT(*) as c FROM life_records WHERE status = 1 AND publish_status = 'draft'"
    );
    const [[likeCount]] = await pool.execute(
      'SELECT COUNT(*) as c FROM life_likes'
    );
    const [[commentCount]] = await pool.execute(
      'SELECT COUNT(*) as c FROM life_comments WHERE status = 1'
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        userCount: userCount.c || 0,
        recordCount: recordTotal.c || 0,
        publishedCount: publishedCount.c || 0,
        pendingCount: pendingCount.c || 0,
        draftCount: draftCount.c || 0,
        likeCount: likeCount.c || 0,
        commentCount: commentCount.c || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 近 N 天趋势（每日发布数、点赞数）
 * Query: days，默认 7
 */
exports.getTrend = async (req, res, next) => {
  try {
    const days = Math.min(31, Math.max(1, parseInt(req.query.days, 10) || 7));
    const [rows] = await pool.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as publishCount
       FROM life_records 
       WHERE status = 1 AND publish_status = 'published' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days]
    );

    const [likeRows] = await pool.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as likeCount
       FROM life_likes 
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days]
    );

    const dateMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      dateMap[dateStr] = { date: dateStr, publishCount: 0, likeCount: 0 };
    }
    rows.forEach((r) => {
      const key = r.date ? String(r.date).slice(0, 10) : '';
      if (dateMap[key]) dateMap[key].publishCount = r.publishCount || 0;
    });
    likeRows.forEach((r) => {
      const key = r.date ? String(r.date).slice(0, 10) : '';
      if (dateMap[key]) dateMap[key].likeCount = r.likeCount || 0;
    });

    const list = Object.keys(dateMap)
      .sort()
      .map((k) => dateMap[k]);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        dates: list.map((x) => x.date.slice(5)),
        publish: list.map((x) => x.publishCount),
        likes: list.map((x) => x.likeCount),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 分类占比（已发布记录的 category 统计）
 */
exports.getCategory = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT category as name, COUNT(*) as value 
       FROM life_records 
       WHERE status = 1 AND publish_status = 'published' AND category IS NOT NULL AND category != ''
       GROUP BY category 
       ORDER BY value DESC 
       LIMIT 20`
    );

    const list = rows.map((r) => ({
      name: r.name || '未分类',
      value: Number(r.value) || 0,
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list },
    });
  } catch (error) {
    next(error);
  }
};
