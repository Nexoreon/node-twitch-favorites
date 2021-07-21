const mongoose = require('mongoose')
const app = require('./app')

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! Shutting Down...', err)
    process.exit(1)
})

mongoose.connect(process.env.DB_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: true,
})
.then(() => console.log('Успешное соединение с датабазой!'))
.catch(err => console.log('Ошибка соединения с датабазой!', err))

const server = app.listen(process.env.PORT || 5000, () => {
    console.log(`Сервер запущен и прослушивается на порте: ${process.env.PORT}`)
})

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err)
    server.close(() => {
        process.exit(1)
    })
})

process.on('SIGTERM', () => { // required in Heroku, since servers restarts every 24 hours
    console.log('SIGTERM RECEIVED! Shutting down...')
    server.close(() => {
        process.exit(1)
    })
})