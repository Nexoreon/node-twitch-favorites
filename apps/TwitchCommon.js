const axios = require('axios')
const chalk = require('chalk')
const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')
const TwitchWatchlist = require('../models/twitchWatchlistModel')
const TwitchBan = require('../models/twitchBanModel');
const pushNotification = require('../utils/pushNotification')

exports.twitchHeaders = {
    'client-id': process.env.TWITCH_CLIENT,
    'Authorization': process.env.TWITCH_TOKEN
}

// converts duration to h:m:s string
exports.convertDuration = duration => {
    let includesHours = duration.includes('h');
    const h = duration.split('h');
    const m = h[includesHours ? 1 : 0].split('m');
    const s = m[1].split('s');
    const hours = h[0];
    let minutes = m[0];
    let secounds = s[0];
    if (minutes.length !== 2) minutes = `0${m[0]}`;
    if (secounds.length !== 2) secounds = `0${s[0]}`;
    return `${includesHours ? `${hours}:` : ''}${minutes}:${secounds}`;
};

exports.updateGameHistory = async ({stream, isFavorite}) => {
    await TwitchGame.findOneAndUpdate({id: stream.game_id}, { // add mark about this event to the game doc
        $push: { 
            history: {
                streamId: stream.id,
                streamerId: stream.user_id,
                streamer: stream.user_login,
                viewers: stream.viewer_count,
                favorite: isFavorite,
                timestamp: Date.now() 
        }}
    })
}

exports.banStreamer = async stream => {
    await TwitchBan.create({ // set a cooldown for this streamer for 6 hours
        userId: stream.user_id,
        userName: stream.user_name,
        game: stream.game_name,
        viewers: stream.viewer_count,
        reason: 'Temp ban',
        expiresIn: Date.now() + 21600000
    });
};

exports.checkBannedStreamers = async () => { // checks if ban timer expired
    await TwitchBan.deleteMany({permanent: false, expiresIn: {$lte: Date.now()}})
    .then(unbanned => unbanned.deletedCount ? console.log(chalk.yellowBright(`[Twitch Games]: ${unbanned.deletedCount} стримера было разблокировано в связи с истечением срока бана`)) : null)
    .catch(err => console.log(chalk.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), err));
};

exports.createStats = async stream => {
    await TwitchStats.create({
        userId: stream.user_id,
        userName: stream.user_name,
        gameId: stream.game_id,
        gameName: stream.game_name,
        viewers: stream.viewer_count,
        title: stream.title
    })
}

exports.sendNotification = ({title, message, link, icon}) => {
    pushNotification.publishToInterests(['project'], { // push notification to users
        web: {
            notification: {
                title,
                body: message,
                deep_link: link,
                icon
            }
        }
    }).then(() => console.log('[Pusher]: Уведомление успешно отравлено!')).catch(e => console.log(chalk.red('[Pusher]: Ошибка отправки уведомления!'), e))
}

exports.createVodSuggestion = async ({ user_id, games }) => {
    const twitchHeaders = {
        'client-id': process.env.TWITCH_CLIENT,
        'Authorization': process.env.TWITCH_TOKEN
    }

    const getVideo = await axios.get(`https://api.twitch.tv/helix/videos?user_id=${user_id}`, {
        headers: twitchHeaders
    })
    const getFollowers = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${user_id}&first=1`, {
        headers: twitchHeaders
    })

    const data = getVideo.data.data[0]
    const followers = getFollowers.data.total
    const { id, title, user_name: author, created_at: streamDate, url } = data

    // find existing suggestions with the same author and game
    const suggestionExists = await TwitchWatchlist.findOne({ author, games, relatedTo: { $exists: false } });
    const newVod = await TwitchWatchlist.create({
        id,
        title,
        author,
        games,
        url,
        meta: {
            streamDate,
            followers
        },
        flags: {
            isSuggestion: true
        },
        ...(suggestionExists && { relatedTo: suggestionExists._id })
    })
    .catch(err => {
        const isDuplicateError = err.code === 'E11000'
        console.log(isDuplicateError ? chalk.red('Такое видео уже было добавлено в список предложений ранее!') : console.log(err));
    });

    if (suggestionExists) await TwitchWatchlist.findByIdAndUpdate({ _id: suggestionExists._id }, { $addToSet: {parts: newVod._id }, updatedAt: Date.now(), sortDate: Date.now() });
};

exports.checkActiveGame = async (id, removeJob, everyGame) => {
    const removeNotifyingData = async () => {
        await TwitchStreamer.findOneAndUpdate({ id }, {
            $set: { 'flags.notifyOnNextGame': false },
            $unset: { gameName: 1 }
        })
        removeJob()
    }

    const updateCurrentGame = async game => {
        await TwitchStreamer.findOneAndUpdate({ id }, {
            $set: { gameName: game }
        });
    };

    const streamer = await TwitchStreamer.findOne({ id }).select({ gameName: 1, avatar: 1 })
    const response = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${id}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            'Authorization': process.env.TWITCH_TOKEN
        }
    })
    const streamData = response.data.data[0]

    if (!streamData) { // if streamer ended the stream, end task and remove game information from document
        console.log('[Twitch Streamers]: Стример закончил стримимить. Удаление задачи...')
        return removeNotifyingData()
    }

    if (everyGame && streamData.game_name !== streamer.gameName) {
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...');
        this.sendNotification({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            icon: streamer.avatar,
            link: `https://twitch.tv/${streamData.user_login}`      
        });
        return updateCurrentGame(streamData.game_name);
    }

    if (streamData.game_name !== streamer.gameName) { // if streamer changed the game, send notification and remove this job
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...')
        this.sendNotification({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            icon: streamer.avatar,
            link: `https://twitch.tv/${streamData.user_login}`      
        })
        return removeNotifyingData()
    } else {
        console.log(`[Twitch Streamers]: Стример ${streamData.user_name} ещё не сменил игру`)
    }
}