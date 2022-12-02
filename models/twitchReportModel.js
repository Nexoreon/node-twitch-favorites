const mongoose = require('mongoose');

const twitchReportSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    highlights: Array,
    follows: Array
});

const TwitchReport = mongoose.model('ma_twitch-report', twitchReportSchema);

module.exports = TwitchReport;