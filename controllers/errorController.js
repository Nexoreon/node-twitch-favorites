const AppError = require("../utils/appError")

sendDevErrors = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        statusCode: err.statusCode,
        message: err.message,
        error: err,
        stack: err.stack
    })
}

sendProdErrors = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    } else {
        res.status(500).json({
            status: 'Error',
            message: 'Something went wrong'
        })
    }
}

const handleCastErrorDB = err => {
    const message = `Wrong path for: ${err.path}. Selected path: ${err.value}`
    return new AppError(message, 404)
}

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
    const message = `Found duplicate: ${value}. Please, use another value`
    return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(val => val.message)
    const message = `Incorrect data. ${errors.join('. ')}`
    return new AppError(message, 400)
}

const handleJWTError = err => { // Для JWT
    return new AppError('Invalid token. Please reauthorize!', 401)
}

const handleJWTExpiredError = err => {
    return new AppError('Your token has expired! Please reauthorize', 401)
}



module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    
    if (err.name === 'CastError') err = handleCastErrorDB(err)
    if (err.code === 11000) err = handleDuplicateFieldsDB(err)
    if (err.name === 'ValidationError') err = handleValidationErrorDB(err)
    if (err.name === 'JsonWebTokenError') err = handleJWTError(err)
    if (err.name === 'TokenExpiredError') err = handleJWTExpiredError(err)

    if (process.env.NODE_ENV === 'development') {
        sendDevErrors(err, res)
    } else if (process.env.NODE_ENV === 'production') {
        sendProdErrors(err, res)
    }
}