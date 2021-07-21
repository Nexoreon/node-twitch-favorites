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
    }).then(() => console.log('[Pusher]: Уведомление успешно отравлено!')).catch(e => console.log(chalk.red('[Pusher]: Ошибка отправки уведомления!'), e))
}