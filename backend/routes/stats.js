const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route GET /api/stats/overview
 * @desc 数据中心概览（用户数、记录数、点赞数、评论数等）
 * @access 仅管理员
 */
router.get('/overview', authenticate, requireAdmin, statsController.getOverview);

/**
 * @route GET /api/stats/trend
 * @desc 近 N 天发布/点赞趋势
 * @access 仅管理员
 */
router.get('/trend', authenticate, requireAdmin, statsController.getTrend);

/**
 * @route GET /api/stats/category
 * @desc 分类占比（已发布记录）
 * @access 仅管理员
 */
router.get('/category', authenticate, requireAdmin, statsController.getCategory);

module.exports = router;
