const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

/**
 * @route GET /api/home/swipers
 * @desc 获取首页轮播图列表
 * @access Public
 */
router.get('/swipers', homeController.getSwipers);

module.exports = router;

