const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
require('dotenv').config({path: './config1.env'})
require('./utils/scheduler')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const appRoutes = require('./routes/appRoutes')
const twitchRoutes = require('./routes/twitchRoutes')

const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.use(cors())
app.use('/api/v1/app', appRoutes)
app.use('/api/v1/twitch', twitchRoutes)
app.all('*', (req, res, next) => {
    next(new AppError(`Unable to find ${req.originalUrl} on the server`, 404))
})
app.use(globalErrorHandler)

module.exports = app