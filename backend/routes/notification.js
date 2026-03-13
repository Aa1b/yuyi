const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

/**
 * @route GET /api/notification/list
 * @desc 获取通知列表
 * @access Private
 */
router.get('/list', authenticate, notificationController.getNotifications);

/**
 * @route POST /api/notification/read
 * @desc 标记通知为已读
 * @access Private
 */
router.post('/read', authenticate, notificationController.markAsRead);

/**
 * @route GET /api/notification/unread-count
 * @desc 获取未读通知数量
 * @access Private
 */
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * @route DELETE /api/notification
 * @desc 删除通知
 * @access Private
 */
router.delete('/', authenticate, notificationController.deleteNotification);

module.exports = router;
