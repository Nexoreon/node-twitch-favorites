const express = require('express');
const settingsController = require('../controllers/settingsController');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.route('/settings/')
.get(settingsController.getSettings)
.post(settingsController.createSettings)
.patch(settingsController.updateSettings);

router.route('/notifications')
.get(notificationController.getNotifications);

module.exports = router;