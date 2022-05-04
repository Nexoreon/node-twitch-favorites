const express = require('express')
const TwitchStreamersController = require('../controllers/TwitchStreamersController')
const TwitchGamesController = require('../controllers/TwitchGamesController')
const TwitchBansController = require('../controllers/TwitchBansController')
const TwitchReportsController = require('../controllers/TwitchReportsController')
const TwitchWatchlistController = require('../controllers/TwitchWatchlistController')

const router = express.Router()

// TWITCH STREAMERS
router.route('/')
.get(TwitchStreamersController.getStreamers)
.post(TwitchStreamersController.createStreamer)

router.route('/streamers/notifyOnNextGame')
.patch(TwitchStreamersController.notifyOnNextGame)

router.route('/streamers/:id')
.get(TwitchStreamersController.getStreamer)
.patch(TwitchStreamersController.updateStreamer)
.delete(TwitchStreamersController.deleteStreamer)

// TWITCH GAMES
router.route('/games')
.get(TwitchGamesController.getAllGames)
.post(TwitchGamesController.createGame)

router.route('/games/:id')
.get(TwitchGamesController.getGame)
.patch(TwitchGamesController.updateGame)
.delete(TwitchGamesController.deleteGame)

router.route('/game/addHistory')
.patch(TwitchGamesController.addGameHistory)

// TWITCH REPORTS
router.route('/reports')
.get(TwitchReportsController.getReports)

// WATCHLIST
router.route('/watchlist')
.get(TwitchWatchlistController.getVideos)
.post(TwitchWatchlistController.addVideo)

router.route('/watchlist/checkVideosAvailability')
.get(TwitchWatchlistController.checkVideosAvailability)

router.route('/watchlist/moveSuggestion')
.patch(TwitchWatchlistController.moveSuggestion)

router.route('/watchlist/:id')
.get(TwitchWatchlistController.getVideo)
.patch(TwitchWatchlistController.updateVideo)
.delete(TwitchWatchlistController.deleteVideo)

// BANNED STREAMERS
router.route('/banned-streamers/')
.get(TwitchBansController.getBannedStreamers)
.post(TwitchBansController.banStreamer)

router.route('/banned-streamers/:id')
.get(TwitchBansController.getBannedStreamer)
.delete(TwitchBansController.unbanStreamer)
.patch(TwitchBansController.editBan)

module.exports = router