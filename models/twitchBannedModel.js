const mongoose = require('mongoose')

const twitchBannedSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    game: String,
    viewers: Number,
    permanent: {
        type: Boolean,
        default: false
    },
    reason: String,
    date: Date,
    expiresIn: Date
})

twitchBannedSchema.pre('save', function(next) {
    if (!this.isNew) return next()
    this.date = Date.now()
    next()
})

const TwitchBanned = mongoose.model('ma_twitch-ban', twitchBannedSchema)

module.exports = TwitchBanned