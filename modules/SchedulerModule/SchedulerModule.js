const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler');
const nodeScheduler = require('node-schedule');
const scheduler = new ToadScheduler();
const Settings = require('../../models/settingsModel');

// IMPORTED TASKS
const TwitchStreamersApp = require('../../apps/TwitchStreamersApp');
const TwitchGamesApp = require('../../apps/TwitchGamesApp');
const TwitchStatsApp = require('../../apps/TwitchStatsApp');
const cacheTwitchFollows = require('./tasks/cacheTwitchFollows');
const cacheWatchlistVods = require('./tasks/cacheWatchlistVods');
const backupReports = require('./tasks/backupReports');

const checkIfEnabled = async param => {
    const settings = await Settings.find();
    return settings[0][param];
};

// SCHEDULE TASKS EXECUTION
// Twitch Streamers: Checks every 15 minutes if streamers i follow plays favorite game
const checkStreams = new SimpleIntervalJob({ minutes: process.env.APP_FOLLOWS_TIMER * 1 }, new Task('checkStreams', async () => {
    if (await checkIfEnabled('enableFollowsCheck')) TwitchStreamersApp();
}));
scheduler.addSimpleIntervalJob(checkStreams);

// Twitch Games: Checks every 30 minutes for streamers that playing a favorite game from the list of games
const checkGames = new SimpleIntervalJob({ minutes: process.env.APP_GAMES_TIMER * 1 }, new Task('checkGames', async () => {
    if (await checkIfEnabled('enableGamesCheck')) TwitchGamesApp();
}));
scheduler.addSimpleIntervalJob(checkGames);

// Twitch Stats: Checks every 24 hours for streamers stats in stats db and generates daily reports
nodeScheduler.scheduleJob({ hour: 23, minute: 59, tz: 'Europe/Moscow'}, async () => {
    if (await checkIfEnabled('enableReportCreation')) TwitchStatsApp();
});

// Cache followed streamers data every day
nodeScheduler.scheduleJob({ hour: 23, minute: 58, tz: 'Europe/Moscow'}, cacheTwitchFollows);
// create twitch reports backup every day
nodeScheduler.scheduleJob({ hour: 0, minute: 5, tz: 'Europe/Moscow' }, backupReports);
// Get watchlist vod data
const checkWatchlist = new SimpleIntervalJob({ hours: 5 }, new Task('checkWatchlist', async () => {
    if (await checkIfEnabled('enableVodDataImport')) cacheWatchlistVods();
}));
scheduler.addSimpleIntervalJob(checkWatchlist);

// RENDER ONLY
if (process.env.PORT * 1 !== 9500) {
    const wakeRender = new SimpleIntervalJob({ minutes: process.env.APP_RECONNECT_TIMER }, new Task('wakeRender', async () => {
        await axios.get('https://node-twitch-favorites.onrender.com/').catch(err => {});
    }));
    scheduler.addSimpleIntervalJob(wakeRender);
}