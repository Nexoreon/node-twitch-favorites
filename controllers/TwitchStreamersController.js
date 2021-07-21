const TwitchStreamer = require('../models/twitchStreamerModel')
const catchAsync = require('../utils/catchAsync')
const APIFeatures = require('../utils/apiFeatures')
const AppError = require('../utils/appError')

exports.getStreamers = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(TwitchStreamer.find(), req.query).filter().sort().limitFields()
    const streamers = await features.query

    res.status(200).json({
        status: 'success',
        data: streamers
    })
})

exports.getStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findById(req.params.id)
    if (!streamer) return next(new AppError("This streamer isn't in the favorites list", 404))

    res.status(200).json({
        status: 'success',
        data: streamer
    })
})

exports.createStreamer = catchAsync(async (req, res, next) => {
    const newStreamer = await TwitchStreamer.create(req.body)

    res.status(201).json({
        status: 'success',
        data: newStreamer
    })
})

exports.updateStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        multi: true
    })
    
    if (!streamer) return next(new AppError("This streamer isn't in the favorites list", 404))

    res.status(200).json({
        status: 'success',
        data: streamer
    })
})

exports.deleteStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findByIdAndDelete(req.params.id)
    if (!streamer) return next(new AppError("This streamer isn't in the favorites list", 404))

    res.status(204).json({
        status: 'success',
        message: 'Streamer successefully removed'
    })
})

// Other

exports.updateScore = catchAsync(async (req, res, next) => {
    const getStreamer = await TwitchStreamer.findById(req.body.id)
    if (!getStreamer) return next(new AppError("This streamer isn't in the favorites list", 404))

    const updateScore = await TwitchStreamer.findByIdAndUpdate(req.body.id, {
        $push: {'score.history': {
                points: getStreamer.score.current, 
                changePoints: req.body.points, 
                reason: req.body.reason, 
                day: new Date().getDate(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                changedAt: Date.now() 
            }},
        $inc: {'score.current': req.body.points}
    })

    res.status(200).json({
        status: 'success',
        data: updateScore
    })
})