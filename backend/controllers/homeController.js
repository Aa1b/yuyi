/**
 * 首页相关控制器
 */

/**
 * 获取首页轮播图列表
 * 目前返回静态数据，实际项目可改为从数据库或配置中心读取
 */
exports.getSwipers = async (req, res, next) => {
  try {
    const swipers = new Array(6).fill('/static/home/swiper0.png');

    res.json({
      code: 200,
      message: '获取成功',
      data: swipers,
    });
  } catch (error) {
    next(error);
  }
};

