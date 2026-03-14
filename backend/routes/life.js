const express = require('express');
const router = express.Router();
const lifeController = require('../controllers/lifeController');
const { authenticate, optionalAuth, requireAdmin } = require('../middleware/auth');

/**
 * @route GET /api/life/list
 * @desc 获取生活记录列表
 * @access Public (支持可选认证)
 */
router.get('/list', optionalAuth, lifeController.getList);

/**
 * @route GET /api/life/liked
 * @desc 获取某用户赞过的记录（不传 userId 为当前用户）
 * @access Public (查看他人需可选认证；本人需登录)
 */
router.get('/liked', optionalAuth, lifeController.getLikedList);

/**
 * @route GET /api/life/detail
 * @desc 获取生活记录详情
 * @access Public (支持可选认证)
 */
router.get('/detail', optionalAuth, lifeController.getDetail);

/**
 * @route POST /api/life/record
 * @desc 创建生活记录
 * @access Private
 */
router.post('/record', authenticate, lifeController.createRecord);

/**
 * @route PUT /api/life/record
 * @desc 更新生活记录
 * @access Private
 */
router.put('/record', authenticate, lifeController.updateRecord);

/**
 * @route DELETE /api/life/record
 * @desc 删除生活记录
 * @access Private
 */
router.delete('/record', authenticate, lifeController.deleteRecord);

/**
 * @route POST /api/life/like
 * @desc 点赞
 * @access Private
 */
router.post('/like', authenticate, lifeController.like);

/**
 * @route DELETE /api/life/like
 * @desc 取消点赞
 * @access Private
 */
router.delete('/like', authenticate, lifeController.unlike);

/**
 * @route GET /api/life/liked
 * @desc 获取我赞过的生活记录列表
 * @access Private
 */
router.get('/liked', authenticate, lifeController.getLikedList);

/**
 * @route GET /api/life/comments
 * @desc 获取评论列表
 * @access Public
 */
router.get('/comments', lifeController.getComments);

/**
 * @route POST /api/life/comment
 * @desc 发表评论
 * @access Private
 */
router.post('/comment', authenticate, lifeController.createComment);

/**
 * @route GET /api/life/categories
 * @desc 获取分类列表
 * @access Public
 */
router.get('/categories', lifeController.getCategories);

/**
 * @route GET /api/life/tags
 * @desc 获取标签列表（热门标签）
 * @access Public
 */
router.get('/tags', lifeController.getTags);

/**
 * @route GET /api/life/search
 * @desc 搜索生活记录
 * @access Public (支持可选认证)
 */
router.get('/search', optionalAuth, lifeController.search);

/**
 * @route POST /api/life/review
 * @desc 审核生活记录（通过 / 驳回）
 * @access 仅管理员（is_admin=1）
 */
router.post('/review', authenticate, requireAdmin, lifeController.reviewRecord);

module.exports = router;
