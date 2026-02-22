const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

router.get('/pending-records', adminController.getPendingRecords);
router.post('/record/:id/approve', adminController.approveRecord);
router.post('/record/:id/reject', adminController.rejectRecord);

module.exports = router;
