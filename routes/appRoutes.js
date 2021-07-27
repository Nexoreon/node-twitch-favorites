const express = require('express')
const appController = require('../controllers/appController')

const router = express.Router()

router.route('/wakeHeroku').get(appController.wakeHeroku)

module.exports = router