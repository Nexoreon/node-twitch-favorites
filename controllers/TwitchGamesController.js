const TwitchGame = require('../models/twitchGameModel')
const TwitchReport = require('../models/twitchReportModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const axios = require('axios')

exports.addGame = catchAsync(async (req, res, next) => {
    const importGame = await axios.get(`https://api.twitch.tv/helix/games?game_id=${req.body.gameId}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            'Authorization': `Bearer ${process.env.TWITCH_TOKEN}`
        }
    })
    const game = importGame.data.data
    const newGame = await TwitchGame.create({
        boxArt: game.box_art_url,
        id: game.id,
        name: game.name,
        search: {
            isSearchable: req.body.isSearchable || true,
            minViewers: req.body.minViewers || 2000
        }
    })

    res.status(201).json({
        status: 'success',
        data: newGame
    })
})

exports.createGame = catchAsync(async (req, res, next) => {
    const newGame = await TwitchGame.create({
        boxArt: req.body.box_art_url,
        name: req.body.name,
        id: req.body.id,
        search: {...req.body.search}
    })

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
    if (!game) return next(new AppError("This game isn't in the favorite games list!", 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})

exports.updateGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, {new: true, multi: true})
    if (!game) return next(new AppError("This game isn't in the favorite games list!", 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})

exports.deleteGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndDelete(req.params.id)
    if (!game) return next(new AppError("This game isn't in the favorite games list!", 404))

    await TwitchReport.deleteMany({gameId: game.id})

    res.status(204).json({
        status: 'success',
        message: 'Successefully removed game'
    })
})

exports.addGameHistory = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findOneAndUpdate({id: req.body.game_id}, {
        $push: {history: {
            streamer_id: req.body.user_id,
            streamer: req.body.user_login,
            day: new Date().getDate(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            timestamp: Date.now() 
        }}
    }, {new: true})
    if (!game) return next(new AppError("This game isn't in the favorite games list!", 404))

    res.status(200).json({
        status: 'success',
        data: game
    })
})