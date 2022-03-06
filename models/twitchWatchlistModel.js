const mongoose = require('mongoose')

const twitchWatchlistSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Vod should have ID from Twitch'],
        unique: [true, 'This vod already been added before']
    },
    title: {
        type: String,
        required: [true, 'Specify title of the vod']
    },
    author: {
        type: String,
        required: [true, 'Specify streamer name']
    },
    url: {
        type: String,
        required: [true, 'Specify link for the vod']
    },
    thumbnail: {
        type: String,
        required: [true, 'Specify preview image link']
    },
    meta: {
        streamDate: Date,
        followers: Number,
    },
    games: {
        type: [String],
        required: [true, 'Specify name of the games']
    },
    priority: {
        type: Number,
        min: 1,
        max: 100
    },
    notes: String,
    duration: String,
    flags: {
        isAvailable: {
            type: Boolean,
            default: true
        },
        isSuggestion: {
            type: Boolean,
            default: false
        },
        isShortTerm: Boolean,
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
})

const TwitchWatchlist = remoteDB.model('ma_twitch-watchlist', twitchWatchlistSchema)

module.exports = TwitchWatchlist