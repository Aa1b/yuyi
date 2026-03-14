const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/message/send
 * @desc 发送留言
 * @access 登录
 */
router.post('/send', authenticate, messageController.sendMessage);

/**
 * @route GET /api/message/conversation
 * @desc 与某用户的会话消息列表
 * @access 登录
 */
router.get('/conversation', authenticate, messageController.getConversation);

/**
 * @route GET /api/message/conversations
 * @desc 会话列表（有留言往来的用户）
 * @access 登录
 */
router.get('/conversations', authenticate, messageController.getConversations);

module.exports = router;
