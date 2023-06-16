const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    enableFollowsCheck: {
        type: Boolean,
        default: true
    },
    enableGamesCheck: {
        type: Boolean,
        default: true
    },
    enableReportCreation: {
        type: Boolean,
        default: true
    },
    enableVodDataImport: {
        type: Boolean,
        default: true
    },
    notifications: {
        follows: {
            push: {
                type: Boolean,
                default: true
            },
            telegram: {
                type: Boolean,
                default: false
            }
        },
        games: {
            push: {
                type: Boolean,
                default: true
            },
            telegram: {
                type: Boolean,
                default: false
            }
        },
        reports: {
            push: {
                type: Boolean,
                default: true
            },
            telegram: {
                type: Boolean,
                default: false
            }
        }
    }
});

const Settings = mongoose.model('th_settings', SettingsSchema);

module.exports = Settings;
