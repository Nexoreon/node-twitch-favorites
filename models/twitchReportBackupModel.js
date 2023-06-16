const mongoose = require('mongoose');

const twitchReportBackupSchema = new mongoose.Schema({
    timestamp: Date,
    highlights: Array,
    follows: Array
});

const TwitchReportBackup = mongoose.model('th_reports_backup', twitchReportBackupSchema);

module.exports = TwitchReportBackup;