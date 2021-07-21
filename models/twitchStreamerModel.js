const mongoose = require('mongoose')

const twitchStreamerSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Streamer ID is required'],
        unique: [true, 'This streamer ID already exists in db']
    },
    login: {
        type: String,
        required: [true, 'Streamer login is required']
    },
    name: {
        type: String,
        required: [true, 'Streamer nickname is required']
    },
    avatar: String,
    score: {
        isDisabled: {
            type: Boolean,
            default: false
        },
        current: {
            type: Number,
            default: 0
        },
        history: Array
    },
    cooldown: Date
})

const TwitchStreamer = mongoose.model('ma_twitch-streamers', twitchStreamerSchema)

module.exports = TwitchStreamer