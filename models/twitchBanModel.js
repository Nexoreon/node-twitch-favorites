const mongoose = require('mongoose');

const twitchBanSchema = new mongoose.Schema({
    userId: {
        type: String,
        unique: true
    },
    userName: String,
    game: String,
    viewers: Number,
    permanent: {
        type: Boolean,
        default: false
    },
    reason: String,
    date: {
        type: Date,
        default: Date.now
    },
    expiresIn: Date,
});

const TwitchBan = mongoose.model('ma_twitch-ban', twitchBanSchema);

module.exports = TwitchBan;