const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * @route POST /api/user/follow
 * @desc 关注用户
 * @access Private
 */
router.post('/follow', authenticate, userController.follow);

/**
 * @route DELETE /api/user/follow
 * @desc 取消关注
 * @access Private
 */
router.delete('/follow', authenticate, userController.unfollow);

/**
 * @route GET /api/user/following
 * @desc 获取关注列表
 * @access Private
 */
router.get('/following', authenticate, userController.getFollowing);

/**
 * @route GET /api/user/followers
 * @desc 获取粉丝列表
 * @access Private
 */
router.get('/followers', authenticate, userController.getFollowers);

/**
 * @route GET /api/user/profile/:userId
 * @desc 获取用户信息（个人主页）
 * @access Public
 */
router.get('/profile/:userId', optionalAuth, userController.getUserProfile);

module.exports = router;
