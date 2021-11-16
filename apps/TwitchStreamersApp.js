const axios = require('axios')
const chalk = require('chalk')
const pushNotification = require('../utils/pushNotification')

const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')
const { createStats, updateGameHistory, sendNotification } = require('./TwitchCommon')

const banStreamer = async user_id => {
    await TwitchStreamer.findOneAndUpdate({id: user_id}, { // set a cooldown for 6 hours
        cooldown: Date.now() + 21600000
    })
}

const checkBannedStreamers = async () => {
    await TwitchStreamer.updateMany({cooldown: {$exists: true, $lte: Date.now()}}, {$unset: {cooldown: ''}})
    .then(banned => banned.modifiedCount ? console.log(chalk.hex('#a970ff')(`[Twitch Streamers]: ${banned.modifiedCount} favorite streamers have been unbanned since ban timer expired`)) : null)
    .catch(err => console.log(chalk.red('[Twitich Streamers]: Error while executing application! Operation has been cancelled.', err)))
}

// MAIN PART

const TwitchStreamersApp = async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Launching favorite streamers check...', new Date(Date.now()).toLocaleString()))
    try {
        checkBannedStreamers()
        const streamersStats = await TwitchStats.find()
        const streamersStatsIDs = streamersStats.map(streamer => streamer.userId)
        const games = await TwitchGame.find()
        const gamesIDs = games.map(game => game.id)
        const following = await TwitchStreamer.find() // get streamers from db
        const followingIDs = following.map(streamer => `user_id=${streamer.id}`) // extract streamers id

        let foundStreams = false // defines if there are suitable streams found
        let twitchResponse // data from twitch will be assigned

        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?${followingIDs.join('&')}`, { // make a get request with streamers id
                headers: {
                    'Authorization': process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT
                }
            })
            console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Successefully got data from Twitch. Processing...'))
            twitchResponse = askTwitch.data.data // set fetched data
        } catch (e) {
            console.log(chalk.red('[Twitch Streamers]: Error while getting data from Twitch!'), e)
        }
    
        twitchResponse.map(async streamer => { // handle received array of live streams
            if (gamesIDs.includes(streamer.game_id)) { // if streamer plays one of the favorite games...
                const findIndex = following.map(str => str.id).indexOf(streamer.user_id) // find array index of streamer
                streamer.avatar = following[findIndex].avatar // set streamer avatar from db
    
                if (!streamersStatsIDs.includes(streamer.user_id)) {
                    createStats(streamer)
                }
    
                if (!following[findIndex].cooldown) { // if streamer doesn't have a cooldown...
                    console.log(chalk.green(`[Twitch Streamers]: Streamer ${streamer.user_name} plays ${streamer.game_name}. Sending notification...`))
                    foundStreams = true
                    sendNotification({
                        title: `${streamer.game_name}`,
                        message: `${streamer.user_name} plays ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        icon: streamer.avatar
                    })
                    updateGameHistory({stream: streamer, isFavorite: true})
                    banStreamer(streamer.user_id)
                }
            }
        })
        if (!foundStreams) console.log(chalk.hex('#a970ff')("[Twitch Streamers]: Haven't found any suitable streams"))
    } catch (err) {
        console.log(chalk.red('[Twitich Streamers]: Error while executing application! Operation has been cancelled.', err))
    }
}

module.exports = TwitchStreamersApp