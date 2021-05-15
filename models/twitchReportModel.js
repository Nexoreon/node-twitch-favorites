const mongoose = require('mongoose')

const twitchReportSchema = new mongoose.Schema({
    stamp: Date,
    date: {
        day: Number,
        month: Number,
        year: Number,
    },
    streams: Array
})

twitchReportSchema.pre('save', function(next) {
    if (!this.isNew) return next()

    this.stamp = Date.now()
    next()
})

const TwitchReport = mongoose.model('ma_twitch-report', twitchReportSchema)

module.exports = TwitchReport