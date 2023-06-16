const axios = require('axios');
const TwitchStreamer = require('../../models/twitchStreamerModel');
const TwitchGame = require('../../models/twitchGameModel');
const TwitchReport = require('../../models/twitchReportModel');
const bot = require('../../utils/TelegramBot');

exports.handleShowCommands = async chatId => {
    bot.sendMessage(chatId, `
/help - Показать список команд 
/check_follows - Проверить активность отслеживаемых стримеров
/check_games - Проверить активность отслеживаемых игр
/get_latest_report - Показать последний ежедневный отчёт`
    );
};

exports.handleCheckStreamers = async chatId => {
    try {
        const streamers = await TwitchStreamer.find();
        const ids = streamers.map(s => `user_id=${s.id}`);
        
        const response = await axios.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, { // make a get request with streamers id
            headers: {
                'Authorization': process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT
            }
        });
    
        const online = [];
        response.data.data.map(s => {
            online.push(`<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong>`);
        });
        if (!online.length) return bot.sendMessage(chatId, 'В данный момент все отслеживаемые стримеры оффлайн');
    
        bot.sendMessage(chatId, `Следующие стримеры онлайн:\n\n${online.join('\n')}`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (err) {
        console.log(`[Telegram Bot]: ERROR: ${err.message} `);
        return bot.sendMessage(chatId, 'Произошла ошибка во время проверки активности стримеров! Попробуйте позже...')
    }
};

exports.handleCheckGames = async chatId => {
    try {
        const games = await TwitchGame.find();
        const ids = games.map(g => g.id);
        const getByIds = games.map(g => `game_id=${g.id}`);

        const response = await axios.get(`https://api.twitch.tv/helix/streams?first=60&${getByIds.join('&')}`, {
            headers: {
                'Authorization': process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT
            }
        });

        const highlights = [];
        const allowedLangs = ['en', 'ru'];
        const viewersRequired = 1000;
        response.data.data.map(s => {
            if (!ids.includes(s.game_id)) return;
            if (allowedLangs.includes(s.language) && s.viewer_count >= viewersRequired) {
                highlights.push(`<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong> с ${s.viewer_count} зрителей`);
            }
        });

        const message = highlights.length ? `Найдены следующие стримы по отслеживаемым играм:\n\n${highlights.join('\n')}` : 'Подходящих стримов не найдено!';
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (err) {
        console.log(`[Telegram Bot]: ERROR: ${err.message}`);
        bot.sendMessage(chatId, 'Произошла ошибка во время проверки активности игр! Попробуйте позже...');
    }
};

exports.handleGetReport = async chatId => {
    const report = await TwitchReport.findOne().sort('-timestamp');
    
    const highlights = [];
    report.highlights.map(hlgt => {
        highlights.push(`- <strong><a href="https://twitch.tv/${hlgt.userName}">${hlgt.userName}</a></strong> играл в <strong><a href="https://twitch.tv/directory/game/${hlgt.gameName}">${hlgt.gameName}</a></strong> с ${hlgt.viewers} зрителей`);
    });

    const follows = [];
    report.follows.map(follow => {
        follows.push(`<strong><a href="https://twitch.tv/${follow.userName}">${follow.userName}</a></strong>\n- ${follow.games.map(game => `${game.name}${game.firstTime ? ' 🆕' : ''}`).join('\n- ')}`);
    });

    bot.sendMessage(chatId, `Отчёт за ${new Date(report.timestamp).toLocaleDateString()}`);
    bot.sendMessage(chatId, `<strong>Выделенное</strong>\n\n${highlights.join('\n')}`, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
    });
    bot.sendMessage(chatId, `<strong>Отслеживаемые стримеры</strong>\n\n${follows.join('\n\n')}`, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
    });
};