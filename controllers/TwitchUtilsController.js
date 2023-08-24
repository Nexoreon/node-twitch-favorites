const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const TwitchReport = require('../models/twitchReportModel');
const TwitchReportBackup = require('../models/twitchReportBackupModel');
const TwitchStreamer = require('../models/twitchStreamerModel');
const TwitchWatchlist = require('../models/twitchWatchlistModel');
const AppError = require('../utils/appError');
const { twitchHeaders, convertDuration } = require('../apps/TwitchCommon');
const Settings = require('../models/settingsModel');

exports.checkReports = catchAsync(async (req, res, next) => {
    let hasAnomaly = false;
    const reports = await TwitchReport.count();
    const latestReport = await TwitchReport.findOne().sort({ timestamp: -1 }).select({ timestamp: 1 });
    if (reports < 10) hasAnomaly = true;

    res.status(200).json({
        status: 'ok',
        data: {
            hasAnomaly,
            amount: reports,
            latest: latestReport
        }
    });
});

exports.createReportsBackup = catchAsync(async (req, res, next) => {
    const reports = await TwitchReport.find();

    await TwitchReportBackup.deleteMany();
    await TwitchReportBackup.insertMany(reports);

    res.status(200).json({
        status: 'ok',
        message: 'Резервная копия отчётов успешно создана'
    });
});

exports.importFollowList = catchAsync(async (req, res, next) => {
    // GET EXISTING AND CURRENT FOLLOW LIST
    const currentFollowList = await TwitchStreamer.find();
    const currentFollowListIds = currentFollowList.map(s => s.id);
    const getFollowList = await axios.get(`https://api.twitch.tv/helix/users/follows?first=100&from_id=${process.env.TWITCH_USER_ID}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            'Authorization': process.env.TWITCH_TOKEN
        }
    })
    .catch(err => console.log(['[IMPORT FOLLOW LIST]: Error while getting current follow list!', err]));
    const followList = getFollowList.data.data

    // CHECK FOR NEW STREAMERS
    const followIds = [];
    const newIds = [];
    await followList.map(streamer => {
        followIds.push(streamer.to_id);
        if (!currentFollowListIds.includes(streamer.to_id)) newIds.push(`id=${streamer.to_id}`);
    });

    // CHECK FOR UNFOLLOWED STREAMERS
    currentFollowListIds.map(async id => {
        if (!followIds.includes(id)) await TwitchStreamer.findOneAndRemove({ id });
    });

    // ADD NEW STREAMERS
    if (!newIds.length) return res.status(200).json({ status: 'ok', message: 'Новых отслеживаемых стримеров не обнаружено!' });
    const getStreamersData = await axios.get(`https://api.twitch.tv/helix/users?${newIds.join('&')}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            'Authorization': process.env.TWITCH_TOKEN
        }
    });

    const streamersData = getStreamersData.data.data;
    const preparedData = []
    await streamersData.map(streamer => {
        preparedData.push({
            id: streamer.id,
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url
        });
    });
    
    preparedData.map(async streamer => { await TwitchStreamer.create(streamer).catch(err => console.log(`Ошибка добавления стримера: ${err.message}`)) });

    res.status(200).json({
        status: 'ok',
        message: 'Список стримеров успешно импортирован'
    });
});

exports.searchGame = catchAsync(async (req, res, next) => {
    const { gameName } = req.query;

    const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${gameName}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            Authorization: process.env.TWITCH_TOKEN
        }
    });

    res.status(200).json({
        status: 'ok',
        data: response.data.data
    });
});

exports.searchStreamer = catchAsync(async (req, res, next) => {
    const { search } = req.query;

    const response = await axios.get(`https://api.twitch.tv/helix/search/channels?query=${search}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            Authorization: process.env.TWITCH_TOKEN
        }
    });

    res.status(200).json({
        status: 'ok',
        data: response.data.data
    });
});

exports.resetNotificationStatus = catchAsync(async (req, res, next) => {
    await TwitchStreamer.updateMany({ 'flags.notifyOnNextGame': true }, {$set: { 'flags.notifyOnNextGame': false }});

    res.status(200).json({
        status: 'ok',
        message: 'Статусы уведомлений при смене игры стримером успешно сбросаны!'
    });
});

exports.getVodsData = catchAsync(async (req, res, next ) => {
    const vods = await TwitchWatchlist.find({ duration: { $exists: false }, platform: 'Twitch', 'flags.isAvailable': true });
    const ids = vods.map(vod => `id=${vod.id}`);

    if (!ids.length && res) res.status(400).json({ status: 'fail', message: 'Видео без данных остутствуют'})
    if (ids.length) await axios.get(`https://api.twitch.tv/helix/videos?${ids.join('&')}`, { // get video info
    headers: twitchHeaders
    })
    .then(async resp => {
        const items = await resp.data.data;
        await items.map(async vod => {
            if (!vod.thumbnail_url.includes('404_processing')) {
                await TwitchWatchlist.findOneAndUpdate({ id: vod.id }, { $set: { duration: convertDuration(vod.duration), thumbnail: vod.thumbnail_url } })
                .catch(err => console.log('[Twitch Watchlist]: Ошибка обновления информации о видео!', err));
            }
        });
    })
    .then(() => {
        if (!res) return;
        res.status(200).json({
            status: 'ok',
            message: 'Данные обновлены для доступных видео'
        });
    })
    .catch(err => { 
        if (res) return next(new AppError('Невозможно получить данные для удаленных видео', 404));
    });
});

exports.getNotificationData = catchAsync(async (req, res, next) => {
    const streamers = await TwitchStreamer.find({}, { id: 1, name: 1, avatar: 1, 'flags.notifyOnNewGame': 1 });
    const enabledForAll = streamers.every(streamer => streamer.flags.notifyOnNewGame === true);

    const settings = await Settings.find();
    const { notifications } = settings[0];

    res.status(200).json({
        status: 'ok',
        data: {
            streamers: {
                items: streamers,
                total: streamers.length,
                enabledForAll
            },
            notifications
        }
    });
});


exports.setNotificationParam = catchAsync(async (req, res, next) => {
    const { param, enabled, enabledForAll } = req.body;

    if (enabledForAll !== undefined) {
        await TwitchStreamer.updateMany({}, { $set: { 'flags.notifyOnNewGame': enabledForAll } });
        return res.status(200).json({
            status: 'ok',
            message: 'Статус уведомлений для всех стримеров изменён!'
        });
    }

    if (param.length !== 8) {
        console.log(param, enabled)
        const updateParam = await Settings.findOneAndUpdate({}, {$set: { [`notifications.${param}`]: enabled }});
        console.log(updateParam)
        if (!updateParam) return next(new AppError('Настройки не инициализированы!', 400));
        return res.status(200).json({
            status: 'ok',
            message: 'Статус уведомления для этого параметра изменён'
        });
    }

    const streamer = await TwitchStreamer.findOneAndUpdate({ id: param }, { $set: { 'flags.notifyOnNewGame': enabled } });
    if (!streamer) return next(new AppError('Такого стримера не найдено в датабазе!', 404));

    res.status(200).json({
        status: 'ok',
        message: 'Статус уведомлений для этого стримера изменён'
    });
});