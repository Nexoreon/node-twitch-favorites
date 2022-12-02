const chalk = require('chalk')
const Table = require('cli-table')

const TwitchStats = require('../models/twitchStatsModel');
const TwitchStreamer = require('../models/twitchStreamerModel');
const TwitchGame = require('../models/twitchGameModel');
const TwitchReport = require('../models/twitchReportModel');
const { sendNotification } = require('./TwitchCommon');

// ABOUT THIS APP: This app generates report every 24 hours if local twitch stats db has data and sends user notification with the link to generated table with streams list
const TwitchStatsApp = async () => {
    console.log(chalk.greenBright('[Twitch Stats]: Запуск составления ежедневного отчёта по стримам...'))
    try {
        // FETCH DATA FROM DB
        const stats = await TwitchStats.find() // get twitch stats from db
        const followsHistory = await TwitchStreamer.find({ streamHistory: { $exists: 1 }}, { streamHistory: 1, name: 1, _id: 0 });
        if (!stats.length && !followsHistory.length) return console.log(chalk.greenBright('[Twitch Stats]: Нету стримов для показа! Таблица сгенерирована не будет')) // if stats has no data, return nothing
        const games = await TwitchGame.find() // get favorite games from db
        const gamesIDs = games.map(game => game.id) // extract ids from games db
        
        // CREATE TABLES
        const tableArray = [] // array that going to be filled with data for the table
        const table = new Table({ // generate table columns
            head: ['Мин. зрителей', 'Зрителей', 'Игра', 'Стример', 'Заголовок'],
            colWidths: [15, 10, 35, 25, 25]
        })
        const followsTableArray = [];
        const followsTable = new Table({
            head: ['Стример', 'Игры'],
            colWidths: [25, 90]
        });
    
        // FILL TABLES
        const statsArray = [] // this array going to be filled with the data that will be sent to the reports collection as a report
        stats.map(stream => { // map all stats
            const findIndex = gamesIDs.indexOf(stream.gameId) // find index of game that streamer played
            const minViewers = games[findIndex].search.minViewers // defines minViewers with special value
            tableArray.push([ minViewers, stream.viewers, stream.gameName, stream.userName, stream.title ]) // push current streamer data to the table array
            statsArray.push({ // push current streamer data to the stats array
                userId: stream.userId, 
                userName: stream.userName, 
                gameId: stream.gameId, 
                gameName: stream.gameName, 
                viewers: stream.viewers, 
                timestamp: stream.date 
            })
        })

        const followsHistoryArray = [];
        followsHistory.map(({ streamHistory, name }) => {
            followsTableArray.push([name, streamHistory.join(', ').toString()]);
            followsHistoryArray.push({ userName: name, games: streamHistory });
        });
        console.log(chalk.greenBright('[Twitch Stats]: Ежедневный отчёт о стримах готов! Генерация таблицы...'))
        table.push(...tableArray)
        followsTable.push(...followsTableArray);
        console.log(chalk.greenBright('[Twitch Stats]: Таблица успешно сгенерирована. Добавление отчёта в датабазу...'))
    
        // CREATE REPORT AND DISPLAY TABLES
        await TwitchReport.create({ // creates daily report with handled data
            timestamp: Date.now(),
            highlights: statsArray,
            follows: followsHistoryArray
        })
        .then(() => console.log(chalk.greenBright('[Twitch Stats]: Отчёт был добавлен в датабазу. Вывод таблицы и отсылка уведомления...')))
        .catch(e => console.log(chalk.red('[Twitch Stats]: Ошибка отправки отчёта в датабазу!'), e))

        sendNotification({
            title: 'Отчёт о стримах готов',
            message: `Ежедневный отчёт о стримах за день готов! Посмотреть?`,
            icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub'
        })
        if (followsTable.length) console.log(followsTable.toString());
        if (table.length) console.log(table.toString());
        await TwitchStreamer.updateMany({ streamHistory: { $exists: 1 }}, {$unset: { streamHistory: 1 }});
        await TwitchStats.deleteMany({}) // deletes all day stats
    } catch (err) {
        console.log(chalk.red('[Twitch Stats]: Произошла ошибка составления отчёта! Отмена операции.'), err)
    }
}

module.exports = TwitchStatsApp