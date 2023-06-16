const bot = require('../../utils/TelegramBot');
const { handleShowCommands, handleCheckGames, handleCheckStreamers, handleGetReport } = require('./commands');

const myId = process.env.TELEGRAM_MY_ID * 1;
bot.setMyCommands([
    { command: '/help', description: 'Показать список команд' },
    { command: '/check_follows', description: 'Проверить активность отслеживаемых стримеров' },
    { command: '/check_games', description: 'Проверить активность отслеживаемых игр' },
    { command: '/get_latest_report', description: 'Показать последний ежедневный отчёт' }
], {  scope: { type: 'chat', chat_id: myId } });

bot.on('message', async (msg, match) => {
    const chatId = msg.chat.id;
    const correctId = msg.from.id === myId;
    if (msg.from.id !== myId) return bot.sendMessage(chatId, '');

    // COMMANDS
    if (correctId && msg.text === '/help') return handleShowCommands(chatId);
    if (correctId && msg.text === '/check_follows') return handleCheckStreamers(chatId);
    if (correctId && msg.text === '/check_games') return handleCheckGames(chatId);
    if (correctId && msg.text === '/get_latest_report') return handleGetReport(chatId);
});

bot.on('callback_query', async (msg) => {
    const chatId = msg.message.chat.id;
    const correctId = msg.from.id === myId;
    if (msg.from.id !== myId) return bot.sendMessage(chatId, 'https://www.youtube.com/watch?v=7OBx-YwPl8g');
});