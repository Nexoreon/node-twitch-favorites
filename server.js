const fs = require('fs');
const https = require('https');
const chalk = require('chalk');
const mongoose = require('mongoose');
const app = require('./app');

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! Shutting Down...', err);
    process.exit(1);
});

mongoose.connect(process.env.DB_URL)
.then(() => console.log(chalk.green('[Датабаза]: Успешное соединение с датабазой!')))
.catch(err => console.log('[Датабаза]: Ошибка соединения с датабазой!', err));

const options = {
    key: fs.readFileSync('./keys/192.168.0.100-key.pem'),
    cert: fs.readFileSync('./keys/192.168.0.100.pem'),
    requestCert: false,
    rejectUnauthorized: false
};

let server;
const successMsg = chalk.green(`[Сервер]: Успешный запуск. Сервер прослушивается на порту: ${process.env.PORT}`)
if (process.env.PORT * 1 === 9500) {
    server = https.createServer(options, app).listen(process.env.PORT, () => {
        console.log(successMsg);
    });
} else {
    server = app.listen(process.env.PORT || 5000, () => {
        console.log(successMsg);
    });
}

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err);
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => { // required in Heroku, since servers restarts every 24 hours
    console.log('SIGTERM RECEIVED! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
});