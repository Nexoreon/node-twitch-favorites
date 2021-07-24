const axios = require('axios')
const chalk = require('chalk')
const Table = require('cli-table')

const TwitchGame = require('../models/twitchGameModel')
const TwitchBan = require('../models/twitchBanModel')
const TwitchStats = require('../models/twitchStatsModel')
const TwitchStreamer = require('../models/twitchStreamerModel')
const { updateGameHistory, createStats, sendNotification } = require('./TwitchCommon')

const checkBannedStreamers = async () => { // checks if banned streamer timer expired
    const unbanExpired = await TwitchBan.deleteMany({permanent: false, expiresIn: {$lte: Date.now()}})
    if (unbanExpired.deletedCount > 0) {
        console.log(chalk.yellowBright(`[Twitch Games]: ${unbanExpired.deletedCount} has been unbanned since ban timer expired`))
    }
}

const banStreamer = async stream => {
    await TwitchBan.create({ // set a cooldown for this streamer for 6 hours
        userId: stream.user_id,
        userName: stream.user_name,
        game: stream.game_name,
        viewers: stream.viewer_count,
        reason: '[Twitch Games]: Automated temporary ban',
        expiresIn: Date.now() + 21600000
    })
}

const TwitchGamesApp = async () => {
    console.log(chalk.yellowBright('[Twitch Games]: Launching checks in Twitch...'), new Date(Date.now()).toLocaleString())
    try {
        checkBannedStreamers()
        const dbStreamersStats = await TwitchStats.find()
        const streamersStatsIDs = dbStreamersStats.map(streamer => streamer.userId)
        
        const dbBannedStreamers = await TwitchBan.find() // get banned streamers from db (streamers getting banned for 6 hours if they already been shown to the user)
        const bannedStreamersIDs = dbBannedStreamers.map(streamer => streamer.userId) // convert to banned streamers ids
        
        const dbFavoriteStreamers = await TwitchStreamer.find()
        const favoriteStreamersIDs = dbFavoriteStreamers.map(streamer => streamer.id)

        const dbGames = await TwitchGame.find({ 'search.isSearchable': true }) // get favorite games from db
        const gamesIDs = dbGames.map(game => game.id) // convert to games ids
        const getGamesIDs = dbGames.map(game => `game_id=${game.id}`) // convert ids for http request 
        let twitchResponse
    
        const table = new Table({
            head: ['Min. viewers', 'Total viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 15, 25, 25, 27]
        })
        const tableArray = []
        
        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?first=60&${getGamesIDs.join('&')}`, { // make a request to twitch api
                headers: {
                    'Authorization': process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT
                }
            })
            console.log(chalk.yellowBright('[Twitch Games]: Successefully got streams data. Processing...'))
    
            twitchResponse = askTwitch.data.data // set fetched data from twitch api (fetched data contains streamers that are currently playing previously specified games)
        } catch (e) {
            console.log(chalk.red('[Twitch Games]: Error while getting streams data!'), e)
        }
    
        twitchResponse.map(async stream => { // map all streams
            if (!bannedStreamersIDs.includes(stream.user_id) && !favoriteStreamersIDs.includes(stream.user_id)) { // if streamer id is in the banned list or favorite list skip him
                if (!streamersStatsIDs.includes(stream.user_id) && stream.language === 'en' && stream.viewer_count >= 1000 || !streamersStatsIDs.includes(stream.user_id) && stream.language === 'ru' && stream.viewer_count >= 2000) {
                    createStats(stream)
                }
        
                if (!bannedStreamersIDs.includes(stream.user_id) && stream.language === 'en') { // make sure that streams language is english
                    const gameIndex = gamesIDs.indexOf(stream.game_id) // get game id that streamer currently playing
                    const minViewers = dbGames[gameIndex].search.minViewers || 2000 // if game db field with value minViewers exists, use it instead of default 2000
                    const gameCover = dbGames[gameIndex].boxArt // get game box art
                    if (stream.viewer_count >= 250) {
                        tableArray.push([minViewers, stream.viewer_count, stream.game_name, stream.user_name, stream.title])
                    }
        
                    if (stream.viewer_count >= minViewers) { // if streamer has more viewers than specified in minViewers variable...
                        console.log(chalk.yellowBright(`Found streamer ${stream.user_name} that plays ${stream.game_name} with ${stream.viewer_count} viwers. Sending notification...`))
                        sendNotification({
                            title: stream.game_name,
                            message: `${stream.user_name} plays ${stream.game_name} with ${stream.viewer_count} viewers`,
                            link: `https://twitch.tv/${stream.user_login}`,
                            icon: gameCover
                        })
                        updateGameHistory({stream, isFavorite: false})
                        banStreamer(stream)
                    }
                }
            }
        })
    
        table.push(...tableArray)
        if (table.length) {
            console.log(table.toString())
        } else {
            console.log(chalk.yellowBright("[Twitch Games]: Haven't found any suitable streams! Skipping table creation"))
        }
    } catch (e) {
        console.log(chalk.red('[Twitch Games]: Error happened while executing application! Canceling operation.'), e)
    }
}

module.exports = TwitchGamesApp