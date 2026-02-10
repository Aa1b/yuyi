/**
 * 404 处理中间件
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    code: 404,
    message: `路由 ${req.originalUrl} 不存在`,
  });
};

module.exports = { notFound };
