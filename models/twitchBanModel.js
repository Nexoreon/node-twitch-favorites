const mongoose = require('mongoose')

const twitchBanSchema = new mongoose.Schema({
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
    expiresIn: Date,
})

twitchBanSchema.pre('save', function(next) {
    if (!this.isNew) return next()
    this.date = Date.now()
    next()
})

const TwitchBan = mongoose.model('ma_twitch-ban', twitchBanSchema)

module.exports = TwitchBan