const chalk = require('chalk');
const Table = require('cli-table');

const TwitchStats = require('../models/twitchStatsModel');
const TwitchStreamer = require('../models/twitchStreamerModel');
const TwitchReport = require('../models/twitchReportModel');
const TwitchGame = require('../models/twitchGameModel');
const { sendNotification } = require('./TwitchCommon');
const { createNotification } = require('../utils/functions');
const Settings = require('../models/settingsModel');
const { handleGetReport } = require('../modules/TelegramBot/commands');

// ABOUT THIS APP: This app generates report every 24 hours if local twitch stats db has data and sends user notification with the link to report with streams list
const TwitchStatsApp = async () => {
    console.log(chalk.greenBright('[Twitch Stats]: Запуск составления ежедневного отчёта по стримам...'));
    const settings = await Settings.find();

    try {
        // FETCH DATA FROM DB
        const stats = await TwitchStats.find(); // get twitch stats from db
        const games = await TwitchGame.find() // get favorite games from db
        const gamesIDs = games.map(game => game.id) // extract ids from games db
        const followsHistory = await TwitchStreamer.find({ streamHistory: { $exists: 1 }}, { streamHistory: 1, name: 1, _id: 0 });
        if (!stats.length && !followsHistory.length) return console.log(chalk.greenBright('[Twitch Stats]: Нету стримов для показа! Таблица сгенерирована не будет')); // if stats has no data, return nothing
        
        const tableArray = []; // array that going to be filled with data for the table
        const table = new Table({ // generate table columns
            head: ['Min. viewers', 'Total viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 10, 35, 25, 25]
        });

        // HANDLE FETCHED DATA
        const statsArray = []; // this array going to be filled with the data that will be sent to the reports collection as a report
        stats.map(stream => { // map all stats
            const findIndex = gamesIDs.indexOf(stream.gameId); // find index of game that streamer played
            const minViewers = games[findIndex].search.minViewers || 2000; // defines minViewers with special value if minViewers field exists, otherwise it will use default 2000
            tableArray.push([ minViewers, stream.viewers, stream.gameName, stream.userName, stream.title ]);
            statsArray.push({ // push current streamer data to the stats array
                userId: stream.userId, 
                userName: stream.userName, 
                gameId: stream.gameId, 
                gameName: stream.gameName, 
                viewers: stream.viewers, 
                timestamp: stream.date 
            });
        });

        const followsHistoryArray = [];
        followsHistory.map(({ streamHistory, name }) => followsHistoryArray.push({ userName: name, games: streamHistory }));
        console.log(chalk.greenBright('[Twitch Stats]: Ежедневный отчёт о стримах готов! Добавление отчёта в датабазу...'));
    
        // CREATE REPORT
        await TwitchReport.create({ // creates daily report with handled data
            timestamp: Date.now(),
            highlights: statsArray,
            follows: followsHistoryArray
        })
        .then(() => console.log(chalk.greenBright('[Twitch Stats]: Отчёт был добавлен в датабазу. Вывод таблицы и отсылка уведомления...')))
        .catch(e => console.log(chalk.red('[Twitch Stats]: Ошибка отправки отчёта в датабазу!'), e));

        table.push(...tableArray); // generates table
        createNotification({
            sendOut: Date.now(),
            receivers: [process.env.USER_ID],
            title: 'Отчёт о стримах готов',
            content: 'Ежедневный отчёт о стримах за день готов',
            link: `https://192.168.0.100/database/mini-apps/twitch-hub`,
            image: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg'
        }, { push: settings[0].notifications.reports.push });
        sendNotification({
            title: 'Отчёт о стримах готов',
            message: `Ежедневный отчёт о стримах за день готов`,
            icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub',
            meta: null
        });
        if (settings[0].notifications.reports.telegram) handleGetReport(process.env.TELEGRAM_MY_ID);
        await TwitchStreamer.updateMany({ streamHistory: { $exists: 1 }}, {$unset: { streamHistory: 1 }});
        await TwitchStats.deleteMany({}); // deletes all day stats
        console.log(table.toString());
    } catch (err) {
        console.log(chalk.red('[Twitch Stats]: Произошла ошибка составления отчёта! Отмена операции.'), err);
    }
};

module.exports = TwitchStatsApp;