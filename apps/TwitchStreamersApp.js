const axios = require('axios')
const chalk = require('chalk')
const pushNotification = require('../utils/pushNotification')

const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')

const year = new Date().getFullYear()
const month = new Date().getMonth() + 1
const day = new Date().getDate()

const TwitchStreamersApp = async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Запуск проверки состояния стримов...'), new Date(Date.now()))
    const streamersStats = await TwitchStats.find()
    const streamersStatsIDs = streamersStats.map(streamer => streamer.userId)
    const games = await TwitchGame.find()
    const gamesIDs = games.map(game => game.id)
    const following = await TwitchStreamer.find() // get streamers from db
    const followingIDs = following.map(streamer => `user_id=${streamer.id}`) // extract streamers id
    let twitchResponse

    try {
        const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?${followingIDs.join('&')}`, { // make a get request with streamers id
            headers: {
                'Authorization': process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT
            }
        })
        console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Данные успешно получены с сервера Twitch. Обработка...'))
        twitchResponse = askTwitch.data.data // set fetched data
    } catch (e) {
        console.log(chalk.red('[Twitch Streamers]: Ошибка получения актуальной информации о стримах!'), e)
    }

    twitchResponse.map(async streamer => { // handle received array of live streams
        if (gamesIDs.includes(streamer.game_id)) { // if streamer plays one of the favorite games...
            const findIndex = following.map(str => str.id).indexOf(streamer.user_id) // find array index of streamer
            streamer.avatar = following[findIndex].avatar // set streamer avatar from db

            if (following[findIndex].cooldown <= Date.now()) { // if streamer has expired cooldown...
                console.log(chalk.hex('#a970ff')(`[Twitch Streamers]: Таймер для стримера ${streamer.user_login} вышел. Разблокировка...`))
                await TwitchStreamer.findOneAndUpdate({id: streamer.user_id}, { // remove cooldown
                    cooldown: undefined
                })
            }

            if (!streamersStatsIDs.includes(streamer.user_id)) {
                await TwitchStats.create({
                    userId: streamer.user_id,
                    userName: streamer.user_name,
                    gameId: streamer.game_id,
                    gameName: streamer.game_name,
                    viewers: streamer.viewer_count,
                    title: streamer.title
                })
            }

            if (!following[findIndex].cooldown) { // if streamer doesn't have a cooldown...
                console.log(chalk.green(`[Twitch Streamers]: Стример ${streamer.user_name} играет в ${streamer.game_name}. Отправка уведомления...`))
                pushNotification.publishToInterests(['project'], { // push notification to users
                    web: {
                        notification: {
                            title: `${streamer.game_name}`,
                            body: `${streamer.user_name} играет в ${streamer.game_name}`,
                            deep_link: `https://twitch.tv/${streamer.user_login}`,
                            icon: streamer.avatar
                        }
                    }
                })
            
                await TwitchGame.findOneAndUpdate({id: streamer.game_id}, { // add mark about this event to the game doc
                    $push: { history: {
                        streamer_id: streamer.user_id,
                        streamer: streamer.user_login,
                        month: month,
                        year: year,
                        day: day,
                        timestamp: Date.now() 
                    }}
                })
    
                await TwitchStreamer.findOneAndUpdate({id: streamer.user_id}, { // set a cooldown for 6 hours
                    cooldown: Date.now() + 21600000
                })
            }
        }
    })
}

module.exports = TwitchStreamersApp