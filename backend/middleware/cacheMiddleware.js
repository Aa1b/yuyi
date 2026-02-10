/**
 * 缓存中间件
 * 用于缓存GET请求的响应
 */

const cache = require('../utils/cache');

/**
 * 创建缓存中间件
 * @param {number} ttl 缓存时间（毫秒），默认5分钟
 * @param {function} keyGenerator 自定义缓存键生成函数
 */
function createCacheMiddleware(ttl = 5 * 60 * 1000, keyGenerator = null) {
  return (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    // 生成缓存键
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 保存原始json方法
    const originalJson = res.json.bind(res);

    // 重写json方法，在响应时缓存结果
    res.json = function (data) {
      // 只缓存成功的响应
      if (data && data.code === 200) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
}

module.exports = createCacheMiddleware;
