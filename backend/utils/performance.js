/**
 * 性能监控工具
 * 用于监控API响应时间、数据库查询时间等
 */

/**
 * API响应时间中间件
 */
function responseTimeMiddleware(req, res, next) {
  const startTime = Date.now();

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // 记录慢请求（超过1秒）
    if (duration > 1000) {
      console.warn('慢请求:', logData);
    } else {
      console.log('请求:', logData);
    }
  });

  next();
}

/**
 * 数据库查询时间监控
 */
function monitorQueryTime(query, params) {
  const startTime = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - startTime;
      if (duration > 500) {
        console.warn('慢查询:', {
          query: query.substring(0, 100),
          duration: `${duration}ms`,
        });
      }
      return duration;
    },
  };
}

module.exports = {
  responseTimeMiddleware,
  monitorQueryTime,
};
