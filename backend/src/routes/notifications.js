const express = require('express');
const router  = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/',              notificationController.listNotifications);
router.patch('/:id/read',    notificationController.markRead);
router.patch('/read-all',    notificationController.markAllRead);

module.exports = router;
