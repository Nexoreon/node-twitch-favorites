const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
require('dotenv').config({path: './config.env'})

const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.use(cors())
app.all('*', (err, req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: 'Такого пути не найдено на сервере'
    })
})

module.exports = app