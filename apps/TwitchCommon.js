const axios = require('axios')
const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchWatchlist = require('../models/twitchWatchlistModel')
const TwitchGame = require('../models/twitchGameModel')
const TwitchStats = require('../models/twitchStatsModel')
const pushNotification = require('../utils/pushNotification')

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
    }).then(() => console.log('[Pusher]: Notification has been successefully sent!')).catch(e => console.log(chalk.red('[Pusher]: Error while sending notification!'), e))
}

exports.createVodSuggestion = async ({ user_id, thumbnail, games }) => {
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

    await TwitchWatchlist.create({
        id,
        title,
        author, 
        thumbnail, 
        games,
        url,
        meta: {
            streamDate,
            followers
        },
        flags: {
            isSuggestion: true
        }
    })
}

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
        console.log('[Twitch Streamers]: Streamer ended the stream. Removing task...')
        return removeNotifyingData()
    }

    if (everyGame && streamData.game_name !== streamer.gameName) {
        console.log('[Twitch Streamers]: Streamer started playing another game. Sending notification...');
        this.sendNotification({
            title: `${streamData.user_name} started playing next game`,
            message: `Streamer ${streamData.user_name} started playing ${streamData.game_name}`,
            icon: streamer.avatar,
            link: `https://twitch.tv/${streamData.user_login}`      
        });
        return updateCurrentGame(streamData.game_name);
    }

    if (streamData.game_name !== streamer.gameName) { // if streamer changed the game, send notification and remove this job
        console.log('[Twitch Streamers]: Streamer started playing another game. Sending notification...')
        this.sendNotification({
            title: `${streamData.user_name} started playing next game`,
            message: `Streamer ${streamData.user_name} started playing ${streamData.game_name}`,
            icon: streamer.avatar,
            link: `https://twitch.tv/${streamData.user_login}`      
        })
        return removeNotifyingData()
    } else {
        console.log(`[Twitch Streamers]: Streamer ${streamData.user_name} still playing current game`)
    }
}