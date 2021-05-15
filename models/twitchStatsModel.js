const mongoose = require('mongoose')

const twitchStatsSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    gameId: String,
    gameName: String,
    viewers: Number,
    title: String,
    date: Date
})

twitchStatsSchema.pre('save', function(next) {
    if (!this.isNew) return next()

    this.date = Date.now()
    next()
})

const TwitchStats = mongoose.model('ma_twitch-stats', twitchStatsSchema)

module.exports = TwitchStats