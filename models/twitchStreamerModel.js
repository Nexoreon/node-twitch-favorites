const mongoose = require('mongoose')

const twitchStreamerSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Необходимо указать ID стримера'],
        unique: [true, 'Такой ID уже существует в базе']
    },
    login: {
        type: String,
        required: [true, 'Необходимо указать логин стримера']
    },
    name: {
        type: String,
        required: [true, 'Необходимо указать никнейм стримера']
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