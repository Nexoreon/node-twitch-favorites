const TwitchStreamer = require('../models/twitchStreamerModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const axios = require('axios')

const { checkActiveGame } = require('../apps/TwitchCommon')
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()

exports.getStreamers = catchAsync(async (req, res, next) => {
    const streamers = await TwitchStreamer.find().sort({ 'score.current': -1, name: -1 });

    const ids = streamers.map(streamer => `user_id=${streamer.id}`);
    const response = await axios.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            Authorization: process.env.TWITCH_TOKEN
        }
    });

    const streamersData = [...streamers]
    await response.data.data.map(async streamer => {
        streamersData.map(async oldStreamer => {
            if (streamer.user_id === oldStreamer.id) {
                oldStreamer._doc = {
                    ...oldStreamer._doc,
                    live: true,
                    game: streamer.game_name
                }
            }
        });
    });

    res.status(200).json({
        status: 'ok',
        data: streamersData
    });
});

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
    const { id } = req.params;
    const { twitchId } = req.query;

    let freshData;
    if (twitchId) {
        freshData = await axios.get(`https://api.twitch.tv/helix/users?id=${twitchId}`, {
            headers: {
                'client-id': process.env.TWITCH_CLIENT,
                Authorization: process.env.TWITCH_TOKEN
            }
        });
        const data = freshData.data.data[0];

        req.body = {
            ...req.body,
            login: data.login,
            name: data.display_name, 
            avatar: data.profile_image_url
        };
    }

    const streamer = await TwitchStreamer.findByIdAndUpdate(id, req.body, {
        new: true,
        multi: true
    })
    
    if (!streamer) return next(new AppError("This streamer isn't in the follow list", 404))

    res.status(200).json({
        status: 'ok',
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

exports.notifyOnNextGame = catchAsync(async (req, res, next) => {
    const { id, duration } = req.query
    const { game } = req.body

    await TwitchStreamer.findOneAndUpdate({ id }, {$set: { // allows to re-add task if server been restarted
        gameName: game,
        'flags.notifyOnNextGame': true
    }})

    scheduler.removeById('checkActiveGame') // remove job with this id if exists to avoid conflict
    const task = new Task('checkActiveGame', () => {
        checkActiveGame(id, () => scheduler.removeById('checkActiveGame'), duration === 'everyGame')
    })

    const scheduledTask = new SimpleIntervalJob({ // execute task every 5 minutes
        minutes: 5
    }, task, 'checkActiveGame')
    scheduler.addSimpleIntervalJob(scheduledTask)

    res.status(200).json({
        status: 'ok',
        message: 'You will be notified when streamer starts to play next game'
    })
})