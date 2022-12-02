const TwitchReport = require('../models/twitchReportModel')
const TwitchStreamer = require('../models/twitchStreamerModel')
const TwitchStats = require('../models/twitchStatsModel')
const catchAsync = require('../utils/catchAsync')

exports.getReports = catchAsync(async (req, res, next) => {
    const { limit, streamer, game } = req.query
    // SEARCH PARAMS
    let match = {};
    if (streamer && !game) {
        match = { $or: [
            {...(streamer && !game && {'highlights.userName': {$regex: `^${streamer}`}})},
            {...(streamer && !game && {'follows.userName': {$regex: `^${streamer}`}})},
        ]}
    }
    if (game && !streamer) {
        match = { $or: [
            {...(game && !streamer && {'highlights.gameName': {$regex: `^${game}`}})},
            {...(game && !streamer && {'follows.games': {$regex: `^${game}`}})}
        ]}
    }

    // QUERY
    const reports = await TwitchReport.aggregate([
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
        }
    ]);
    
    reports.map(async report => {
        await report.follows.map(streamer => {
            let user = report.followList.filter(user => {
                if (user.name === streamer.userName) return user;
            })[0];
            if (user && user.avatar) streamer.avatar = user.avatar
        });
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