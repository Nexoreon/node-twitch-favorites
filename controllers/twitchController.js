const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')

const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchBanned = require('../models/twitchBannedModel')
const TwitchGame = require ('../models/twitchGameModel')

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
    if (!streamer) return next(new AppError('Такого стримера не найдено в датабазе', 404))

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
    
    if (!streamer) return next(new AppError('Такого стримера не найдено в датабазе', 404))

    res.status(200).json({
        status: 'success',
        data: streamer
    })
})

exports.deleteStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findByIdAndDelete(req.params.id)
    if (!streamer) return next(new AppError('Такого стримера не найдено в датабазе', 404))

    res.status(204).json({
        status: 'success',
        message: 'Стример успешно удалён'
    })
})

// Other

exports.updateScore = catchAsync(async (req, res, next) => {
    const year = new Date().getFullYear()
    const month = new Date().getMonth() + 1

    const getStreamer = await TwitchStreamer.findById(req.body.id)
    if (!getStreamer) return next(new AppError('Такого стримера не найдено в датабазе', 404))

    const updateScore = await TwitchStreamer.findByIdAndUpdate(req.body.id, {
        $push: {[`score.history.${year}.${month}`]: {
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

// Twitch Game

exports.createGame = catchAsync(async (req, res, next) => {
    const newGame = await TwitchGame.create(req.body)

    res.status(201).json({
        status: 'success',
        data: newGame
    })
})

exports.getAllGames = catchAsync(async (req, res, next) => {
    const games = await TwitchGame.find()

    res.status(200).json({
        status: 'success',
        data: games
    })
})

exports.getGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findById(req.params.id)
    if (!game) return next(new AppError('Такой игры не найдено в датабазе!', 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})

exports.updateGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, {new: true, multi: true})
    if (!game) return next(new AppError('Такой игры не найдено в датабазе!', 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})

exports.deleteGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndDelete(req.params.id)
    if (!game) return next(new AppError('Такой игры не найдено в датабазе!', 404))

    res.status(204).json({
        status: 'success',
        message: 'Игра успешно удалена'
    })
})

exports.addGameHistory = catchAsync(async (req, res, next) => {
    const year = new Date().getFullYear()
    const month = new Date().getMonth() + 1

    const game = await TwitchGame.findOneAndUpdate({id: req.body.game_id}, {
        $push: {[`history.${year}.${month}`]: {
            streamer_id: req.body.user_id,
            streamer: req.body.user_login,
            date: Date.now() 
        }}
    }, {new: true})
    if (!game) return next(new AppError('Такой игры не найдено в датабазе!', 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})

// Banned Twitch streamer

exports.banStreamer = catchAsync(async (req, res, next) => {
    const newStreamer = await TwitchBanned.create(req.body)

    res.status(201).json({
        status: 'success',
        data: newStreamer
    })
})

exports.getBannedStreamers = catchAsync(async (req, res, next) => {
    const bannedStreamers = await TwitchBanned.find()

    res.status(200).json({
        status: 'success',
        data: bannedStreamers
    })
})

exports.unbanStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchBanned.findOne(req.body)
    if (!streamer) return next(new AppError('Такого стримера нету в списке забаненных!', 404))

    res.status(204).json({
        status: 'success',
        message: 'Стример успешно разбанен'
    })
})

exports.wakeHeroku = catchAsync(async (req, res, next) => {
    console.log('Wake up Dyno')

    res.status(200).json({
        status: 'success'
    })
})