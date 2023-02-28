const TwitchBan = require('../models/twitchBanModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

exports.banStreamer = catchAsync(async (req, res, next) => {
    let { expiresIn } = req.body
    expiresIn = Date.now() + expiresIn * 3600000 // received hours * ms
    const newStreamer = await TwitchBan.create({...req.body, expiresIn})

    res.status(201).json({
        status: 'ok',
        data: newStreamer
    })
})

exports.getBannedStreamers = catchAsync(async (req, res, next) => {
    const bannedStreamers = await TwitchBan.find().sort({date: -1})

    res.status(200).json({
        status: 'ok',
        data: bannedStreamers
    })
})

exports.getBannedStreamer = catchAsync(async (req, res, next) => {
    const bannedStreamer = await TwitchBan.findById(req.params.id)
    if (!bannedStreamer) return next(new AppError('Такого стримера нету в списке забаненных!', 404))

    res.status(200).json({
        status: 'ok',
        data: bannedStreamer
    })
})

exports.editBan = catchAsync(async (req, res, next) => {
    const { date, expiresIn, permanent, reason } = req.body;

    const bannedStreamer = await TwitchBan.findByIdAndUpdate(req.params.id, { date, expiresIn, permanent, reason }, {new: true});
    if (!bannedStreamer) return next(new AppError('Такого стримера нету в списке забаненных!', 404));

    res.status(200).json({
        status: 'ok',
        message: 'Данные о блокировке успешно отредактированы'
    });
});

exports.unbanStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchBan.findByIdAndDelete(req.params.id)
    if (!streamer) return next(new AppError('Такого стримера нету в списке забаненных!', 404))

    res.status(204).json({
        status: 'ok',
        message: 'Стример успешно разбанен'
    })
})