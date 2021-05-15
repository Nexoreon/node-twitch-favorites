const mongoose = require('mongoose')

const twitchGameSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'ID игры должно быть заполнено'],
        unique: [true, 'Такая игра уже существует в датабазе']
    },
    name: {
        type: String,
        required: [true, 'Имя игры должно быть заполнено']
    },
    box_art: String,
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