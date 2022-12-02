const axios = require('axios')
const chalk = require('chalk')
const Table = require('cli-table')

const TwitchGame = require('../models/twitchGameModel')
const TwitchBan = require('../models/twitchBanModel')
const TwitchStats = require('../models/twitchStatsModel')
const TwitchStreamer = require('../models/twitchStreamerModel')
const { updateGameHistory, createStats, sendNotification, createVodSuggestion } = require('./TwitchCommon')

const checkBannedStreamers = async () => { // checks if banned streamer timer expired
    await TwitchBan.deleteMany({permanent: false, expiresIn: {$lte: Date.now()}})
    .then(unbanned => unbanned.deletedCount ? console.log(chalk.yellowBright(`[Twitch Games]: ${unbanned.deletedCount} стримера было разблокировано в связи с истечением срока бана`)) : null)
    .catch(err => console.log(chalk.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), err))
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
    console.log(chalk.yellowBright('[Twitch Games]: Запуск проверки игр на Twitch...'), new Date(Date.now()).toLocaleString())
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
            head: ['Мин. зрителей', 'Всего зрителей', 'Игра', 'Стример', 'Заголовок'],
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
            console.log(chalk.yellowBright('[Twitch Games]: Данные о стримах успешно получены. Обработка...'))
    
            twitchResponse = askTwitch.data.data // set fetched data from twitch api (fetched data contains streamers that are currently playing previously specified games)
        } catch (e) {
            console.log(chalk.red('[Twitch Games]: Ошибка получения данных о стримах!'), e)
        }
    
        twitchResponse.map(async stream => { // map all streams
            if (!bannedStreamersIDs.includes(stream.user_id) && !favoriteStreamersIDs.includes(stream.user_id) && gamesIDs.includes(stream.game_id)) { // if streamer id is in the banned list or favorite list skip him. TWITCH API BUG FIX APPLIED: Check if game id exists in followed games ids list
                if (!streamersStatsIDs.includes(stream.user_id) && stream.language === 'en' && stream.viewer_count >= 1000 || !streamersStatsIDs.includes(stream.user_id) && stream.language === 'ru' && stream.viewer_count >= 2000) {
                    createStats(stream)
                }
        
                if (!bannedStreamersIDs.includes(stream.user_id) && stream.language === 'en' || !bannedStreamersIDs.includes(stream.user_id) && stream.language === 'ru') { // make sure that streams language is russian or english
                    const gameIndex = gamesIDs.indexOf(stream.game_id) // get game id that streamer currently playing
                    const minViewers = dbGames[gameIndex].search.minViewers // min amount of viewers required to trigger notification
                    const gameCover = dbGames[gameIndex].boxArt.replace('XSIZExYSIZE', '100x140') // get game box art
                    if (stream.viewer_count >= 1000) {
                        tableArray.push([minViewers, stream.viewer_count, stream.game_name, stream.user_name, stream.title])
                    }
        
                    if (stream.viewer_count >= minViewers) { // if streamer has more viewers than specified in minViewers variable...
                        console.log(chalk.yellowBright(`Найден стример ${stream.user_name} который играет в ${stream.game_name} с ${stream.viewer_count} зрителями. Отсылка уведомления...`))
                        sendNotification({
                            title: stream.game_name,
                            message: `${stream.user_name} играет в ${stream.game_name} с ${stream.viewer_count} зрителями`,
                            link: `https://twitch.tv/${stream.user_login}`,
                            icon: gameCover
                        })
                        createVodSuggestion({
                            user_id: stream.user_id,
                            games: [stream.game_name]
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
            console.log(chalk.yellowBright('[Twitch Games]: Подходящих по критериям стримов не найдено! Таблица составлена не будет'))
        }
    } catch (e) {
        console.log(chalk.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), e)
    }
}

module.exports = TwitchGamesApp