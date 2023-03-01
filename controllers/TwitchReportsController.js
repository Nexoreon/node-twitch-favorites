const TwitchReport = require('../models/twitchReportModel');
const TwitchStreamer = require('../models/twitchStreamerModel');
const TwitchStats = require('../models/twitchStatsModel');
const catchAsync = require('../utils/catchAsync');
const TwitchStatsApp = require('../apps/TwitchStatsApp');

exports.getReports = catchAsync(async (req, res, next) => {
    const { limit, streamer, game } = req.query
    // SEARCH PARAMS
    let match = {};
    if (streamer && !game) {
        match = { $or: [
            {'highlights.userName': {$regex: `^${streamer}`}},
            {'follows.userName': {$regex: `^${streamer}`}},
        ]}
    }
    if (game && !streamer) {
        match = { $or: [
            {'highlights.gameName': {$regex: `^${game}`}},
            {'follows.games': {$regex: `^${game}`}}
        ]}
    }

    // QUERY
    let pipeline = [];
    const searchPipeline = [
        { $unwind: '$follows' },
        { $project: { 'highlights': 0 }},
        { $match: match },
        { $group:
            {
                _id: { timestamp: '$timestamp' },
                items: { $push: { userName: '$follows.userName', games: `$follows.games` }},
                followList: { $push: '$followList' }
            } 
        },
        { $addFields: { timestamp: '$_id.timestamp' }},
        { $sort: { timestamp: -1 }}
    ];

    if (streamer || game) pipeline = searchPipeline;
    pipeline = [
        { 
            $match: match
        },
        {
            $lookup: { 
                from: 'ma_twitch-streamers',
                pipeline: [
                    { $project: { avatar: 1, name: 1 }}
                ],
                as: 'followList'
            }
        },
        {
            $sort: { timestamp: -1 }
        },
        {
            $limit: limit * 1
        },
        ...pipeline
    ];
    const reports = await TwitchReport.aggregate(pipeline);
    
    reports.map(async report => {
        if (!game && !streamer) {
            await report.follows.map(streamer => {
                let user = report.followList.filter(user => {
                    if (user.name === streamer.userName) return user;
                })[0];
                if (user && user.avatar) streamer.avatar = user.avatar
            });
        } else {
            await report.items.map(item => {
                let user = report.followList[0].filter(user => {
                    if (user.name === item.userName) return user;
                })[0];
                if (user && user.avatar) item.avatar = user.avatar;
            });
        }
    });

    // QUERY TODAY REPORT
    const todayFollows = await TwitchStreamer.find({ 'streamHistory': {$exists: true }}, { userName: '$name', avatar: 1, games: '$streamHistory' });
    const todayHighlights = await TwitchStats.find();
    const today = { highlights: todayHighlights, follows: todayFollows };
    let items = [...reports];
    if (!game && !streamer) items = [today, ...reports];
    
    const total = await TwitchReport.count(match);

    res.status(200).json({
        status: 'success',
        data: {
            items,
            total
        }
    });
});

exports.createDailyReport = catchAsync(async (req, res, next) => {
    await TwitchStatsApp()
    .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Ежедневный отчёт успешно составлен'
        });
    })
    .catch(err => next(new AppError('Ошибка составления ежедневного отчёта', 500))); 
});
