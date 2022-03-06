const TwitchStreamer = require('../models/twitchStreamerModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

const { checkActiveGame } = require('../apps/TwitchCommon')
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()

exports.getStreamers = catchAsync(async (req, res, next) => {
    const streamers = await TwitchStreamer.find().sort({ 'score.current': -1, name: -1 })

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
                changedAt: Date.now() 
            }},
        $inc: {'score.current': req.body.points}
    })

    res.status(200).json({
        status: 'success',
        data: updateScore
    })
})

exports.notifyOnNextGame = catchAsync(async (req, res, next) => {
    const { id } = req.query
    const { game } = req.body

    await TwitchStreamer.findOneAndUpdate({ id }, {$set: { // allows to re-add task if server been restarted
        gameName: game,
        'flags.notifyOnNextGame': true
    }})

    scheduler.removeById('checkActiveGame') // remove job with this id if exists to avoid conflict
    const task = new Task('checkActiveGame', () => {
        checkActiveGame(id, () => scheduler.removeById('checkActiveGame'))
    })

    const scheduledTask = new SimpleIntervalJob({ // execute task every 5 minutes
        minutes: 5
    }, task, 'checkActiveGame')
    scheduler.addSimpleIntervalJob(scheduledTask)

    res.status(200).json({
        status: 'ok'
    })
})