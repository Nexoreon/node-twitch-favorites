const catchAsync = require('../utils/catchAsync')

exports.wakeHeroku = catchAsync(async (req, res, next) => {
    console.log('Wake up Dyno')

    res.status(200).json({
        status: 'success'
    })
})