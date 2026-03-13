const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const https = require('https');

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

    // 兼容两种环境变量命名：优先使用 WECHAT_APPID/WECHAT_SECRET，其次使用 WX_APPID/WX_SECRET
    const appid = process.env.WECHAT_APPID || process.env.WX_APPID;
    const secret = process.env.WECHAT_SECRET || process.env.WX_SECRET;

    if (!appid || !secret) {
      return res.status(500).json({
        code: 500,
        message: '服务端未配置微信登录参数，请设置 WECHAT_APPID/WECHAT_SECRET 或 WX_APPID/WX_SECRET',
      });
    }

    // 调用微信 jscode2session 接口获取 openid / session_key
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    const sessionData = await new Promise((resolve, reject) => {
      https
        .get(url, (resp) => {
          let data = '';
          resp.on('data', (chunk) => {
            data += chunk;
          });
          resp.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.errcode) {
                reject(new Error(json.errmsg || '微信登录失败'));
              } else {
                resolve(json);
              }
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    const { openid, unionid = null, session_key: sessionKey } = sessionData;

    if (!openid) {
      return res.status(500).json({
        code: 500,
        message: '微信登录失败，未获取到 openid',
      });
    }

    // 查询或创建用户
    let [users] = await pool.execute(
      'SELECT id, openid, nickname, avatar, is_admin FROM users WHERE openid = ?',
      [openid]
    );

    let user;
    if (users.length === 0) {
      // 创建新用户
      const [result] = await pool.execute(
        'INSERT INTO users (openid, unionid, nickname, avatar) VALUES (?, ?, ?, ?)',
        [
          openid,
          unionid,
          userInfo?.nickName || '微信用户',
          userInfo?.avatarUrl || '',
        ]
      );
      
      [users] = await pool.execute(
        'SELECT id, openid, nickname, avatar, is_admin FROM users WHERE id = ?',
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
          isAdmin: user.is_admin === 1,
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

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const [result] = await pool.execute(
      'INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)',
      [phone, hashedPassword, nickname || '用户']
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
