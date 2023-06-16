const chalk = require('chalk');
const { getVodsData } = require('../../../controllers/TwitchUtilsController');

cacheWatchlistVods = async () => {
    console.log(chalk.yellow('[Twitch Watchlist]: Запуск проверки и получения данных для ожидающих видео...'));
    getVodsData();
};

module.exports = cacheWatchlistVods;
