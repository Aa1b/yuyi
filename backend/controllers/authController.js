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
 * 用户注册（备用方案）
 */
exports.register = async (req, res, next) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        code: 400,
        message: '手机号和密码不能为空',
      });
    }

    // 检查手机号是否已注册
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '该手机号已注册',
      });
    }

    // 加密密码；openid 必填，手机号注册用 phone_ 前缀
    const hashedPassword = await bcrypt.hash(password, 10);
    const openid = `phone_${phone}`;

    const [result] = await pool.execute(
      'INSERT INTO users (openid, phone, password, nickname) VALUES (?, ?, ?, ?)',
      [openid, phone, hashedPassword, nickname || '用户']
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
 * 账号密码登录（手机号/账号 + 密码）
 */
exports.passwordLogin = async (req, res, next) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({
        code: 400,
        message: '账号和密码不能为空',
      });
    }

    // 支持手机号或 openid(phone_xxx) 登录
    const [users] = await pool.execute(
      'SELECT id, nickname, avatar, password FROM users WHERE phone = ? OR openid = ?',
      [account, account.startsWith('phone_') ? account : `phone_${account}`]
    );

    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '账号不存在，请先注册',
      });
    }

    const user = users[0];
    if (!user.password) {
      return res.status(401).json({
        code: 401,
        message: '该账号未设置密码，请使用其他方式登录',
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        code: 401,
        message: '密码错误',
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
 * 获取当前用户信息
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      'SELECT id, openid, nickname, avatar, gender, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: users[0],
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
