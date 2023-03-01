const express = require('express');
const TwitchStreamersController = require('../controllers/TwitchStreamersController');
const TwitchGamesController = require('../controllers/TwitchGamesController');
const TwitchBansController = require('../controllers/TwitchBansController');
const TwitchReportsController = require('../controllers/TwitchReportsController');
const TwitchWatchlistController = require('../controllers/TwitchWatchlistController');
const TwitchUtilsController = require('../controllers/TwitchUtilsController');

const router = express.Router();

// WATCHLIST
router.route('/watchlist')
.get(TwitchWatchlistController.getVideos)
.post(TwitchWatchlistController.addVideo);

router.route('/getSuggestions')
.get(TwitchWatchlistController.getSuggestions);

router.route('/watchlist/getParts')
.get(TwitchWatchlistController.getParts);

router.route('/watchlist/checkVideosAvailability')
.get(TwitchWatchlistController.checkVideosAvailability);

router.route('/watchlist/moveSuggestion')
.patch(TwitchWatchlistController.moveSuggestion);

router.route('/watchlist/:id')
.patch(TwitchWatchlistController.updateVideo)
.delete(TwitchWatchlistController.deleteVideo);

// TWITCH STREAMERS
router.route('/')
.get(TwitchStreamersController.getStreamers)
.post(TwitchStreamersController.createStreamer);

router.route('/streamers/notifyOnNextGame')
.patch(TwitchStreamersController.notifyOnNextGame);

router.route('/streamers/:id')
.get(TwitchStreamersController.getStreamer)
.patch(TwitchStreamersController.updateStreamer)
.delete(TwitchStreamersController.deleteStreamer);

// TWITCH GAMES
router.route('/games')
.get(TwitchGamesController.getAllGames)
.post(TwitchGamesController.createGame);

router.route('/games/:id')
.get(TwitchGamesController.getGame)
.patch(TwitchGamesController.updateGame)
.delete(TwitchGamesController.deleteGame);

router.route('/game/addHistory')
.patch(TwitchGamesController.addGameHistory);

// REPORTS
router.route('/reports')
.get(TwitchReportsController.getReports);

// BANNED STREAMERS
router.route('/banned-streamers/')
.get(TwitchBansController.getBannedStreamers)
.post(TwitchBansController.banStreamer);

router.route('/banned-streamers/:id')
.get(TwitchBansController.getBannedStreamer)
.delete(TwitchBansController.unbanStreamer)
.patch(TwitchBansController.editBan);

// UTILS
router.route('/utils/getVodsData')
.patch(TwitchUtilsController.getVodsData);

router.route('/utils/checkReports')
.get(TwitchUtilsController.checkReports);

router.route('/utils/importFollowList')
.get(TwitchUtilsController.importFollowList);

router.route('/utils/searchGame')
.get(TwitchUtilsController.searchGame);

router.route('/utils/searchStreamer')
.get(TwitchUtilsController.searchStreamer);

router.route('/utils/resetNotificationStatus')
.get(TwitchUtilsController.resetNotificationStatus);

router.route('/utils/checkStreamersActivity')
.get(TwitchStreamersController.checkStreamersActivity);

router.route('/utils/checkGamesActivity')
.get(TwitchGamesController.checkGamesActivity);

router.route('/utils/createDailyReport')
.post(TwitchReportsController.createDailyReport);

module.exports = router;