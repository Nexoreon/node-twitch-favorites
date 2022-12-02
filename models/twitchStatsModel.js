const mongoose = require('mongoose');

const twitchStatsSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    gameId: String,
    gameName: String,
    viewers: Number,
    title: String,
    date: {
        type: Date,
        default: Date.now
    }
});

const TwitchStats = mongoose.model('ma_twitch-stats', twitchStatsSchema);

module.exports = TwitchStats;