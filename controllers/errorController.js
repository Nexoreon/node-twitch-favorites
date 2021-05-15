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
            status: 'Ошибка',
            message: 'Что-то пошло не так'
        })
    }
}

const handleCastErrorDB = err => {
    const message = `Неправильный путь для: ${err.path}. Указанный путь: ${err.value}`
    return new AppError(message, 404)
}

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
    const message = `Обнаружен дубликат значения: ${value}. Пожалуйста, используйте другое значение`
    return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(val => val.message)
    const message = `Неправильно введенные данные. ${errors.join('. ')}`
    return new AppError(message, 400)
}

const handleJWTError = err => { // Для JWT
    return new AppError('Невалидный токен. Пожалуйста переавторизируйтесь!', 401)
}

const handleJWTExpiredError = err => {
    return new AppError('Ваш токен авторизации истёк! Пожалуйста переавторизируйтесь', 401)
}



module.exports = (err, req, res, next) => { // При присутствие параметра err, express определяет этот хэндлер как обработчик ошибок
    err.statusCode = err.statusCode || 500 // Если передается statusCode, то оставляем. Если нет то по умолчанию номер ошибки 500
    err.status = err.status || 'error' // Если передается статус ошибки, то оставляем. Если нет то по умолчанию статус 'fail'
    
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