const express = require('express')
const twitchController = require('../controllers/twitchController')

const router = express.Router()

router.route('/').get(twitchController.getStreamers).post(twitchController.createStreamer)
router.route('/streamers/:id').get(twitchController.getStreamer).patch(twitchController.updateStreamer).delete(twitchController.deleteStreamer)
router.route('/streamer/updateScore').patch(twitchController.updateScore)

router.route('/games').get(twitchController.getAllGames).post(twitchController.createGame)
router.route('/games/:id').get(twitchController.getGame).patch(twitchController.updateGame).delete(twitchController.deleteGame)
router.route('/game/addHistory').patch(twitchController.addGameHistory)

router.route('/banned-streamers/').get(twitchController.getBannedStreamers).post(twitchController.banStreamer).delete(twitchController.unbanStreamer)
router.route('/heroku').get(twitchController.wakeHeroku)

module.exports = router