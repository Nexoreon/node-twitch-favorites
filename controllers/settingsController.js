const Settings = require('../models/settingsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createSettings = catchAsync(async (req, res, next) => {
    const checkSettings = await Settings.find();
    if (checkSettings.length) return next(new AppError('Настройки были инициализированы ранее!', 400));
    await Settings.create(req.body);

    res.status(201).json({
        status: 'ok',
        message: 'Настройки успешно инициализированы!'
    });
});

exports.getSettings = catchAsync(async (req, res, next) => {
    const settings = await Settings.find();
    if (!settings.length) return next(new AppError('Сначала инициализируйте настройки!', 404));

    res.status(200).json({
        status: 'ok',
        data: settings[0]
    });
});

exports.updateSettings = catchAsync(async (req, res, next) => {
    const settings = await Settings.updateOne({}, { $set: { ...req.body }});
    if (!settings) return next(new AppError('Сначала инициализируйте настройки!', 404));

    res.status(200).json({
        status: 'ok',
        message: 'Настройки успешно обновлены'
    });
});