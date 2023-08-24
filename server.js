const fs = require('fs');
const https = require('https');
const chalk = require('chalk');
const mongoose = require('mongoose');
const app = require('./app');
const Settings = require('./models/settingsModel');
const telegramBot = require('./utils/TelegramBot');

// CONNECT TO DATABASE
mongoose.connect(process.env.DB_URL)
.then(() => console.log(chalk.green('[Датабаза]: Успешное соединение с датабазой!')))
.catch(err => console.log('[Датабаза]: Ошибка соединения с датабазой!', err));

// START SERVER
let server;
const successMsg = chalk.green(`[Сервер]: Успешный запуск. Сервер прослушивается на порту: ${process.env.PORT}`)
if (process.env.PORT * 1 === 9500) {
    const options = {
        key: fs.readFileSync('./keys/192.168.0.100-key.pem'),
        cert: fs.readFileSync('./keys/192.168.0.100.pem'),
        requestCert: false,
        rejectUnauthorized: false
    };
    server = https.createServer(options, app).listen(process.env.PORT, () => {
        console.log(successMsg);
    });
} else {
    server = app.listen(process.env.PORT || 5000, () => {
        console.log(successMsg);
    });
}

// SHUTDOWN SERVER ON ERROR
const shutdownServer = async err => {
    const settings = await Settings.find();
    const { notifications } = settings[0];

    if (notifications.error.telegram) {
        const text = `Критическая ошибка! Приложение было остановлено из за произошедшей ошибки
<code>${err}</code>`
        new Promise(async (resolve, reject) => {
            await telegramBot.sendMessage(process.env.TELEGRAM_MY_ID * 1, text, {
            parse_mode: 'HTML'
            });
            setTimeout(resolve, 1000);
        })
        .finally(() => {
            server.close(() => {
                process.exit(1);
            });
        })
    } else {
        server.close(() => {
            process.exit(1);
        });
    }
};

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! Shutting Down...', err);
    shutdownServer(err)
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err);
    shutdownServer(err);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
});