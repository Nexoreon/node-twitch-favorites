const chalk = require('chalk')
const Table = require('cli-table')

const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')
const TwitchReport = require('../models/twitchReportModel')
const { sendNotification } = require('./TwitchCommon')

// ABOUT THIS APP: This app generates report every 24 hours if local twitch stats db has data and sends user notification with the link to generated table with streams list
const TwitchStatsApp = async () => {
    console.log(chalk.greenBright('[Twitch Stats]: Launching report creation tool...'))
    try {
        const stats = await TwitchStats.find() // get twitch stats from db
        if (!stats.length) return console.log(chalk.greenBright("[Twitch Stats]: No records found in database! Table isn't going to be created")) // if stats has no data, return nothing
        const games = await TwitchGame.find() // get favorite games from db
        const gamesIDs = games.map(game => game.id) // extract ids from games db
        const tableArray = [] // array that going to be filled with data for the table
        const table = new Table({ // generate table columns
            head: ['Min. viewers', 'Viewers', 'Game', 'Streamer', 'Title'],
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
        console.log(chalk.greenBright('[Twitch Stats]: Everyday report is ready! Adding in database...'))
    
        await TwitchReport.create({ // creates daily report with handled data
            timestamp: Date.now(),
            streams: statsArray
        }).then(() => console.log(chalk.greenBright('[Twitch Stats]: The report has been added in database. Generating table...'))).catch(e => console.log(chalk.red('[Twitch Stats]: Error while adding report in database!'), e))
    
        table.push(...tableArray) // generates table
        console.log(chalk.greenBright('[Twitch Stats]: The table has been successefully generated. Showing table and sending notification...'))
        sendNotification({
            title: 'Streams report is ready',
            message: `Everyday report is ready! Take a look...`,
            icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg', // TODO to be included with the project
            link: 'https://192.168.0.100/database/dist/mini-apps/twitch-hub' // TODO include frontend application and link
        })
        
        console.log(table.toString())
        await TwitchStats.deleteMany({}) // deletes all day stats
    } catch (err) {
        console.log(chalk.red('[Twitch Stats]: Error while creating report! Cancelling operation.'), err)
    }
}

module.exports = TwitchStatsApp