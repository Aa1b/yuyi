/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('错误详情:', err);

  // 默认错误信息
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // MySQL 错误处理
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    message = '数据已存在';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = '关联数据不存在';
  } else if (err.code === 'ER_BAD_FIELD_ERROR') {
    statusCode = 400;
    message = '字段错误';
  }

  // JWT 错误处理
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的认证令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '认证令牌已过期';
  }

  // 验证错误处理
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // 返回错误响应
  res.status(statusCode).json({
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
