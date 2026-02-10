const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/auth/login
 * @desc 用户登录（微信小程序登录）
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/password-login
 * @desc 账号密码登录（手机号 + 密码）
 * @access Public
 */
router.post('/password-login', authController.passwordLogin);

/**
 * @route GET /api/auth/profile
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户信息
 * @access Private
 */
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
