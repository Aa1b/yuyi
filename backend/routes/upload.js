const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @route POST /api/upload/image
 * @desc 上传图片
 * @access Private
 */
router.post('/image', authenticate, upload.single('image'), uploadController.uploadImage);

/**
 * @route POST /api/upload/video
 * @desc 上传视频
 * @access Private
 */
router.post('/video', authenticate, upload.single('video'), uploadController.uploadVideo);

/**
 * @route DELETE /api/upload/file
 * @desc 删除文件
 * @access Private
 */
router.delete('/file', authenticate, uploadController.deleteFile);

module.exports = router;
