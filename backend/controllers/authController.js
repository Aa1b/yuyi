const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * 生成 JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * 用户登录（微信小程序登录）
 */
exports.login = async (req, res, next) => {
  try {
    const { code, userInfo } = req.body;

    if (!code) {
      return res.status(400).json({
        code: 400,
        message: '缺少 code 参数',
      });
    }

    // TODO: 调用微信API获取openid和session_key
    // 这里使用模拟数据
    const openid = `mock_openid_${Date.now()}`;
    const sessionKey = `mock_session_key_${Date.now()}`;

    // 查询或创建用户
    let [users] = await pool.execute(
      'SELECT id, openid, nickname, avatar FROM users WHERE openid = ?',
      [openid]
    );

    let user;
    if (users.length === 0) {
      // 创建新用户
      const [result] = await pool.execute(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
        [
          openid,
          userInfo?.nickName || '微信用户',
          userInfo?.avatarUrl || '',
        ]
      );
      
      [users] = await pool.execute(
        'SELECT id, openid, nickname, avatar FROM users WHERE id = ?',
        [result.insertId]
      );
      user = users[0];
    } else {
      user = users[0];
      
      // 更新用户信息（如果提供）
      if (userInfo) {
        await pool.execute(
          'UPDATE users SET nickname = ?, avatar = ? WHERE id = ?',
          [userInfo.nickName || user.nickname, userInfo.avatarUrl || user.avatar, user.id]
        );
        user.nickname = userInfo.nickName || user.nickname;
        user.avatar = userInfo.avatarUrl || user.avatar;
      }
    }

    // 生成 token
    const token = generateToken(user.id);

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户注册（邮箱 + 密码 + 昵称）
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    const emailTrim = (email || '').trim();

    if (!emailTrim || !password) {
      return res.status(400).json({
        code: 400,
        message: '邮箱和密码不能为空',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码至少6位',
      });
    }

    // 检查邮箱是否已注册
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [emailTrim]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '该邮箱已注册',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const openid = `email_${emailTrim}`;

    const [result] = await pool.execute(
      'INSERT INTO users (openid, email, password, nickname) VALUES (?, ?, ?, ?)',
      [openid, emailTrim, hashedPassword, nickname || '用户']
    );

    const token = generateToken(result.insertId);

    res.status(201).json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.insertId,
          nickname: nickname || '用户',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 邮箱 + 密码登录
 */
exports.passwordLogin = async (req, res, next) => {
  try {
    const { account, password } = req.body;
    const email = (account || '').trim();

    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: '邮箱和密码不能为空',
      });
    }

    const [users] = await pool.execute(
      'SELECT id, nickname, avatar, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
      });
    }

    const user = users[0];
    if (!user.password) {
      return res.status(401).json({
        code: 401,
        message: '该账号未设置密码，请使用微信登录',
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
      });
    }

    const token = generateToken(user.id);
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码（仅邮箱注册用户）
 */
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: '原密码和新密码不能为空',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '新密码至少6位',
      });
    }

    const [users] = await pool.execute(
      'SELECT id, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const user = users[0];
    if (!user.password) {
      return res.status(400).json({
        code: 400,
        message: '当前账号为微信登录，无法修改密码',
      });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({
        code: 401,
        message: '原密码错误',
      });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [
      hashedNew,
      userId,
    ]);

    res.json({
      code: 200,
      message: '密码修改成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      'SELECT id, openid, nickname, avatar, gender, phone, is_admin, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const user = users[0];

    // 尝试获取客户端 IP（考虑反向代理场景）
    let ip =
      (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0]) ||
      req.ip ||
      (req.connection && req.connection.remoteAddress) ||
      '';

    // 仅显示到“省份级”——这里用掩码的方式只保留 IPv4 前两段
    let displayIp = ip;
    if (ip) {
      // 处理形如 ::ffff:127.0.0.1 的情况
      if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
      }
      if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length >= 4) {
          displayIp = `${parts[0]}.${parts[1]}.x.x`;
        }
      } else if (ip.includes(':')) {
        // IPv6 简单脱敏
        const segs = ip.split(':');
        displayIp = `${segs[0]}::`;
      }
    }

    user.ip = displayIp;
    user.role = user.is_admin === 1 ? 'admin' : 'user';

    res.json({
      code: 200,
      message: '获取成功',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户信息
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { nickname, avatar, gender } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (nickname !== undefined) {
      updateFields.push('nickname = ?');
      updateValues.push(nickname);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateValues.push(avatar);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有要更新的字段',
      });
    }

    updateValues.push(userId);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // 返回更新后的用户信息
    const [users] = await pool.execute(
      'SELECT id, nickname, avatar, gender FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '更新成功',
      data: users[0],
    });
  } catch (error) {
    next(error);
  }
};
