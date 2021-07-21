const express = require('express')
const TwitchStreamersController = require('../controllers/TwitchStreamersController')
const TwitchGamesController = require('../controllers/TwitchGamesController')
const TwitchBansController = require('../controllers/TwitchBansController')
const TwitchReportsController = require('../controllers/TwitchReportsController')

const router = express.Router()

router.route('/').get(TwitchStreamersController.getStreamers).post(TwitchStreamersController.createStreamer)
router.route('/streamers/:id').get(TwitchStreamersController.getStreamer).patch(TwitchStreamersController.updateStreamer).delete(TwitchStreamersController.deleteStreamer)
router.route('/streamer/updateScore').patch(TwitchStreamersController.updateScore)

router.route('/games').get(TwitchGamesController.getAllGames).post(TwitchGamesController.createGame)
router.route('/games/:id').get(TwitchGamesController.getGame).patch(TwitchGamesController.updateGame).delete(TwitchGamesController.deleteGame)
router.route('/game/addHistory').patch(TwitchGamesController.addGameHistory)

router.route('/reports').get(TwitchReportsController.getReports)

router.route('/banned-streamers/').get(TwitchBansController.getBannedStreamers).post(TwitchBansController.banStreamer)
router.route('/banned-streamers/:id').get(TwitchBansController.getBannedStreamer).delete(TwitchBansController.unbanStreamer).patch(TwitchBansController.editBan)

module.exports = router