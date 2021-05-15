const chalk = require('chalk')
const Table = require('cli-table')
const pushNotification = require('../utils/pushNotification')

const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')
const TwitchReport = require('../models/twitchReportModel')

const year = new Date().getFullYear()
const month = new Date().getMonth() + 1
const day = new Date().getDate()

// ABOUT THIS APP: This app generates report every 24 hours if local twitch stats db has data and sends user notification with the link to generated table with streams list
const TwitchStatsApp = async () => {
    console.log(chalk.greenBright('[Twitch Stats]: Запуск составления ежедневного отчёта по стримам...'))
    const stats = await TwitchStats.find() // get twitch stats from db
    const games = await TwitchGame.find() // get favorite games from db
    const gamesIDs = games.map(game => game.id) // extract ids from games db

    if (!stats.length) return console.log(chalk.greenBright('[Twitch Stats]: Нету стримов для показа! Таблица сгенерирована не будет')) // if stats has no data, return nothing

    const tableArray = [] // array that going to be filled with data for the table
    const table = new Table({ // generate table columns
        head: ['Мин. зрителей', 'Зрителей', 'Игра', 'Стример', 'Заголовок'],
        colWidths: [15, 10, 35, 25, 25]
    })

    const statsArray = [] // this array going to be filled with the data that will be sent to the reports collection as a report
    stats.map(stream => { // map all stats
        const findIndex = gamesIDs.indexOf(stream.gameId) // find index of game that streamer played
        const minViewers = games[findIndex].search.minViewers || 2000 // defines minViewers with special value if minViewers field exists, otherwise it will use default 2000
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
    console.log(chalk.greenBright('[Twitch Stats]: Ежедневный отчёт о стримах готов! Добавление в датабазу...'))

    await TwitchReport.create({ // creates daily report with handled data
        date: {
            day: day,
            month: month,
            year: year
        },
        streams: statsArray
    }).then(() => console.log(chalk.greenBright('[Twitch Stats]: Отчёт был добавлен в датабазу. Генерация таблицы...'))).catch(e => console.log(chalk.red('[Twitch Stats]: Ошибка отправки отчёта в датабазу!'), e))

    table.push(...tableArray) // generates table
    console.log(chalk.greenBright('[Twitch Stats]: Таблица успешно сгенерирована. Вывод таблицы и отсылка уведомления...'))
    pushNotification.publishToInterests(['project'], { // push notification to users
        web: {
            notification: {
                title: 'Отчёт о стримах готов',
                body: `Ежедневный отчёт о стримах за день готов! Просмотри сейчас...`,
                icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg'
            }
        }
    }).then(() => console.log(chalk.greenBright('[Twitch Stats]: Уведомление успешно отравлено!'))).catch(e => console.log(chalk.red('[Twitch Stats: Ошибка отправки уведомления!'), e))

    console.log(table.toString())

    await TwitchStats.deleteMany({}) // deletes all day stats
}

module.exports = TwitchStatsApp