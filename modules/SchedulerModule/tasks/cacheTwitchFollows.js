const axios = require('axios');
const chalk = require('chalk');

const TwitchStreamer = require('../../../models/twitchStreamerModel');

cacheTwitchFollows = async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Старт кэширования отслеживаемых стримеров...'))
    const streamers = await TwitchStreamer.find();
    const ids = streamers.map(streamer => `id=${streamer.id}`);

    const response = await axios.get(`https://api.twitch.tv/helix/users?${ids.join('&')}`, {
        headers: {
            'Authorization': process.env.TWITCH_TOKEN,
            'client-id': process.env.TWITCH_CLIENT
        }
    })
    .catch(err => console.log(chalk.red(`[Twitch Streamers]: Ошибка обновления данных отслеживаемых стримеров! ${err}`)))

    await response.data.data.map(async streamer => {
        await TwitchStreamer.findOneAndUpdate({ id: streamer.id }, {
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url
        });
    })
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Отслеживаемые стримеры успешно прокэшированны!'))
    
};

module.exports = cacheTwitchFollows;