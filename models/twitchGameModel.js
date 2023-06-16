const mongoose = require('mongoose');

const twitchGameSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Game ID is required'],
        unique: true
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
            default: 2000
        }
    },
    history: Array,
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const TwitchGame = mongoose.model('ma_twitch-game', twitchGameSchema);

module.exports = TwitchGame;