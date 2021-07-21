const mongoose = require('mongoose')

const twitchGameSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Game ID is required'],
        unique: [true, 'This game already exists in db']
    },
    name: {
        type: String,
        required: [true, 'Game name is required']
    },
    boxArt: String,
    search: {
        isSearchable: {
            type: Boolean,
            default: true
        },
        minViewers: {
            type: Number,
        }
    },
    history: Array
})

const TwitchGame = mongoose.model('ma_twitch-game', twitchGameSchema)

module.exports = TwitchGame