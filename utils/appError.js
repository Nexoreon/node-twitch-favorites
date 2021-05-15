class AppError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error' // Если статус код начинается с 4, то выводим fail. В ином случае error
        this.isOperational = true

        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError