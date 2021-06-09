const axios = require('axios')
const chalk = require('chalk')
const Table = require('cli-table')
const pushNotification = require('../utils/pushNotification')

const TwitchGame = require('../models/twitchGameModel')
const TwitchBanned = require('../models/twitchBannedModel')
const TwitchStats = require('../models/twitchStatsModel')

const year = new Date().getFullYear().toString()
const month = (new Date().getMonth() + 1).toString()
const day = new Date().getDate().toString()

const TwitchGamesApp = async () => {
    console.log(chalk.yellowBright(`[Twitch Games]: ${new Date(Date.now()).toLocaleString()}`))
    console.log(chalk.yellowBright('[Twitch Games]: Запуск проверки игр на Twitch...'))
    try {
        const dbStreamersStats = await TwitchStats.find()
        const streamersStatsIDs = dbStreamersStats.map(streamer => streamer.userId)
    
        const dbBannedStreamers = await TwitchBanned.find() // get banned streamers from db (streamers getting banned for 6 hours if they already been shown to the user)
        const bannedStreamersIDs = dbBannedStreamers.map(streamer => streamer.userId) // convert to banned streamers ids
    
        const dbGames = await TwitchGame.find({ 'search.isSearchable': true }) // get favorite games from db
        const gamesIDs = dbGames.map(game => game.id) // convert to games ids
        const getGamesIDs = dbGames.map(game => `game_id=${game.id}`) // convert ids for http request 
        let twitchResponse
    
        const table = new Table({ // DEBUG
            head: ['Мин. зрителей', 'Всего зрителей', 'Игра', 'Стример', 'Заголовок'],
            colWidths: [15, 15, 25, 25, 27]
        })
        const tableArray = [] // DEBUG
        
        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?first=60&${getGamesIDs.join('&')}`, { // make a request to twitch api
                headers: {
                    'Authorization': process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT
                }
            })
            console.log(chalk.yellowBright('[Twitch Games]: Данные о стримах успешно получены. Обработка...'))
    
            twitchResponse = askTwitch.data.data // set fetched data from twitch api (fetched data contains streamers that are currently playing previously specified games)
        } catch (e) {
            console.log(chalk.red('[Twitch Games]: Ошибка получения данных о стримах!'), e)
        }
    
        twitchResponse.map(async stream => { // map all streams
            if (bannedStreamersIDs.includes(stream.user_id)) { // if streamer id is in the banned list, check if ban timer expired
                const findIndex = bannedStreamersIDs.indexOf(stream.user_id)
                const expiresIn = dbBannedStreamers[findIndex].expiresIn
                const permanent = dbBannedStreamers[findIndex].permanent
        
                if (expiresIn <= Date.now() && !permanent) { // if ban timer expired, remove streamer from banned db
                    console.log(chalk.yellowBright(`[Twitch Games]: Таймер бана для стримера ${stream.user_name} вышел. Разблокировка...`))
                    await TwitchBanned.deleteOne({userId: stream.user_id})
                }
            }
    
            if (!streamersStatsIDs.includes(stream.user_id) && stream.language === 'en' && stream.viewer_count >= 1000 || !streamersStatsIDs.includes(stream.user_id) && stream.language === 'ru' && stream.viewer_count >= 2000) {
                await TwitchStats.create({
                    userId: stream.user_id,
                    userName: stream.user_name,
                    gameId: stream.game_id,
                    gameName: stream.game_name,
                    viewers: stream.viewer_count,
                    title: stream.title
                })
            }
    
            if (!bannedStreamersIDs.includes(stream.user_id) && stream.language === 'en' || !bannedStreamersIDs.includes(stream.user_id) && stream.language === 'ru') { // make sure that streams language is russian or english
                const gameIndex = gamesIDs.indexOf(stream.game_id) // get game id that streamer currently playing
                const minViewers = dbGames[gameIndex].search.minViewers || 2000 // if game db field with value minViewers exists, use it instead of default 2000
                const gameCover = dbGames[gameIndex].boxArt // get game box art
                if (stream.viewer_count >= 250) {
                    tableArray.push([minViewers, stream.viewer_count, stream.game_name, stream.user_name, stream.title]) // DEBUG
                }
    
                if (stream.viewer_count >= minViewers) { // if streamer has more viewers than specified in minViewers variable...
                    console.log(chalk.yellowBright(`Найден стример ${stream.user_name} который играет в ${stream.game_name} с ${stream.viewer_count} зрителями. Отсылка уведомления...`))
                    pushNotification.publishToInterests(['project'], { // push notification to users
                        web: {
                            notification: {
                                title: stream.game_name,
                                body: `${stream.user_name} играет в ${stream.game_name} с ${stream.viewer_count} зрителями`,
                                deep_link: `https://twitch.tv/${stream.user_login}`,
                                icon: gameCover
                            }
                        }
                    })
        
                    await TwitchGame.findOneAndUpdate({id: stream.game_id}, { // add mark about this event to the game doc
                        $push: { history: {
                            streamId: stream.id,
                            streamerId: stream.user_id,
                            streamer: stream.user_login,
                            viewers: stream.viewer_count,
                            favorite: false,
                            month: month,
                            year: year,
                            day: day,
                            timestamp: Date.now() 
                        }}
                    })
        
                    await TwitchBanned.create({ // set a cooldown for this streamer for 6 hours
                        userId: stream.user_id,
                        userName: stream.user_name,
                        game: stream.game_name,
                        viewers: stream.viewer_count,
                        reason: '[Twitch Games]: Automated temporary ban',
                        expiresIn: Date.now() + 21600000
                    })
                }
            }
        })
    
        table.push(...tableArray)
        if (table.length) {
            console.log(table.toString())
        } else {
            console.log(chalk.yellowBright('[Twitch Games]: Подходящих по критериям стримов не найдено! Таблица составлена не будет'))
        }
    } catch (err) {
        console.log(chalk.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), err)
    }
}

module.exports = TwitchGamesApp