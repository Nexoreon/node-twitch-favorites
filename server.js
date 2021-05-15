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

const server = app.listen(5000, () => {
    console.log('Сервер запущен и прослушивается на порте: 5000')
})

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err)
    server.close(() => {
        process.exit(1)
    })
})