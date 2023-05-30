const axios = require('axios');
const chalk = require('chalk');
const pushNotification = require('../utils/pushNotification');

const TwitchStreamer = require('../models/twitchStreamerModel');
const TwitchGame = require('../models/twitchGameModel');
const TwitchStats = require('../models/twitchStatsModel');
const TwitchBan = require('../models/twitchBanModel');
const TwitchReport = require('../models/twitchReportModel');
const { banStreamer, checkBannedStreamers, createStats, updateGameHistory, sendNotification, createVodSuggestion } = require('./TwitchCommon');

const addToStreamHistory = async (userId, userName, gameName) => {
    const playedGames = await TwitchReport.aggregate([ // get all games that been played by streamer
        { $match: { 'follows.userName': userName }},
        { $unwind: '$follows' },
        { $match: { 'follows.userName': userName }},
        { $unwind: '$follows.games' },
        { $group: { _id: null, data: {$addToSet: '$follows.games.name' }}},
        { $project: { _id: 0 }},
    ]);
    const games = playedGames[0].data;
    const firstTime = !games.includes(gameName); // check if he already played that game before

    await TwitchStreamer.updateOne({ id: userId }, {
        $addToSet: { streamHistory: { name: gameName, firstTime } }
    });
};

// MAIN PART
const TwitchStreamersApp = async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Запуск проверки избранных стримеров...', new Date(Date.now()).toLocaleString()));
    try {
        checkBannedStreamers();
        const streamersStats = await TwitchStats.find();
        const streamersStatsIDs = streamersStats.map(streamer => streamer.userId);
        const bannedStreamers = await TwitchBan.find();
        const bannedStreamersIDs = bannedStreamers.map(streamer => streamer.userId);
        const games = await TwitchGame.find();
        const gamesIDs = games.map(game => game.id);
        const following = await TwitchStreamer.find(); // get streamers from db
        const followingIDs = following.map(streamer => `user_id=${streamer.id}`); // extract streamers id

        let foundStreams = false; // defines if there are suitable streams found
        let twitchResponse; // data from twitch will be assigned

        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?${followingIDs.join('&')}`, { // make a get request with streamers id
                headers: {
                    'Authorization': process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT
                }
            });
            console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Данные успешно получены с сервера Twitch. Обработка...'));
            twitchResponse = askTwitch.data.data; // set fetched data
        } catch (e) {
            console.log(chalk.red('[Twitch Streamers]: Ошибка получения актуальной информации о стримах!'), e);
        }
    
        twitchResponse.map(async streamer => { // handle received array of live streams
            const index = following.map(str => str.id).indexOf(streamer.user_id); // find array index of streamer
            const streamerData = following[index];

            if (!streamerData.streamHistory.map(game => game.name).includes(streamer.game_name) && streamer.game_name !== 'Just Chatting') {
                addToStreamHistory(streamer.user_id, streamer.user_name, streamer.game_name);
            }
            if (gamesIDs.includes(streamer.game_id)) { // if streamer plays one of the favorite games...
                streamer.avatar = following[index].avatar; // set streamer avatar from db
    
                if (!streamersStatsIDs.includes(streamer.user_id)) createStats(streamer);
                if (!bannedStreamersIDs.includes(streamer.user_id)) { // if streamer doesn't have a cooldown...
                    console.log(chalk.green(`[Twitch Streamers]: Стример ${streamer.user_name} играет в ${streamer.game_name}. Отправка уведомления...`));
                    foundStreams = true;
                    sendNotification({
                        title: `${streamer.game_name}`,
                        message: `${streamer.user_name} играет в ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        icon: streamer.avatar
                    });
                    createVodSuggestion({
                        user_id: streamer.user_id,
                        games: [streamer.game_name]
                    });
                    updateGameHistory({stream: streamer, isFavorite: true});
                    banStreamer(streamer);
                }
            }
        });
        if (!foundStreams) console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Подходящих по критериям стримов не найдено'));
    } catch (err) {
        console.log(chalk.red('[Twitich Streamers]: Произошла ошибка во время получения данных! Операция отменена.', err));
    }
};

module.exports = TwitchStreamersApp;