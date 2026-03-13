const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * JWT 认证中间件
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');

    // 查询用户信息
    const [users] = await pool.execute(
      'SELECT id, openid, nickname, avatar FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
      });
    }

    // 将用户信息附加到请求对象
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期',
      });
    }
    
    console.error('认证错误:', error);
    return res.status(500).json({
      code: 500,
      message: '认证失败',
    });
  }
};

/**
 * 可选认证中间件（token 存在则验证，不存在也不报错）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      
      const [users] = await pool.execute(
        'SELECT id, openid, nickname, avatar FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length > 0) {
        req.user = users[0];
      }
    }
    
    next();
  } catch (error) {
    // 认证失败不影响请求继续
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
