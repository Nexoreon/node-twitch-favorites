const TwitchWatchlist = require('../models/twitchWatchlistModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const axios = require('axios')
const { twitchHeaders, convertDuration } = require('../apps/TwitchCommon');

const suggestionsQuery = { 'flags.isSuggestion': true, relatedTo: { $exists: false }};

exports.getVideos = catchAsync(async (req, res, next) => {
    const { suggestionsLimit } = req.query;
    const videos = await TwitchWatchlist.aggregate([
        { $match: { 'flags.isSuggestion': false }},
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts'
        }},
        { $sort: { priority: -1 }}
    ]);
    const mnTotal = videos.length;

    const suggestions = await TwitchWatchlist.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts'
        }},
        { $sort: { sortDate: -1 }},
        { $limit: suggestionsLimit * 1 }
    ]);
    const sgTotal = await TwitchWatchlist.countDocuments(suggestionsQuery);

    res.status(200).json({
        status: 'ok',
        data: {
            main: {
                items: videos,
                total: mnTotal
            },
            suggestions: {
                items: suggestions,
                total: sgTotal
            }
        }
    });
});

exports.getSuggestions = catchAsync(async (req, res, next) => {
    const { limit } = req.query;
    const suggestions = await TwitchWatchlist.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts'
        }},
        { $sort: { sortDate: -1 }},
        { $limit: limit * 1 }
    ]);
    const total = await TwitchWatchlist.countDocuments(suggestionsQuery);
    
    res.status(200).json({
        status: 'ok',
        data: {
            suggestions: {
                items: suggestions,
                total
            }
        }
    });
});

exports.getParts = catchAsync(async (req, res, next) => {
    const { relatedTo } = req.query;
    if (!relatedTo) return next(new AppError('Не указан ID родительского видео!', 400));
    const parts = await TwitchWatchlist.find({ relatedTo });

    res.status(200).json({
        status: 'ok',
        data: {
            total: parts.length,
            items: parts
        }
    });
});

exports.addVideo = catchAsync(async (req, res, next) => {
    const { url } = req.body
    let splitedUrl = url.split('/')
    let videoId = splitedUrl[splitedUrl.length - 1]

    if (url.includes('youtube')) {
        splitedUrl = url.split('=')
        videoId = splitedUrl[1]
        await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.YOUTUBE_API_KEY}&id=${videoId}&part=snippet,contentDetails`)
        .then(async resp => {
            const video = resp.data.items[0];
            const vidInfo = video.snippet;
            const duration = video.contentDetails.duration.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', "");
            
            req.body = {
                ...req.body,
                id: videoId,
                platform: 'YouTube',
                title: vidInfo.title,
                author: vidInfo.channelTitle,
                thumbnail: vidInfo.thumbnails.medium.url,
                meta: {
                    streamDate: Date.now(),
                    followers: 0
                },
                duration
            };
        })
    } else if (url.includes('twitch.tv')) {
        const test = await axios.get(`https://api.twitch.tv/helix/videos?id=${videoId}`, { // get video info
        headers: twitchHeaders
    })
    .then(async resp => {
            console.log(resp)
            const vidInfo = resp.data.data[0];
            const duration = convertDuration(vidInfo.duration);
            const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');
    
            req.body = {
                ...req.body,
                id: videoId,
                platform: 'Twitch',
                title: vidInfo.title,
                author: vidInfo.user_name,
                ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url })
            };
    
            await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${vidInfo.user_id}&first=1`, { // then get follows info
                headers: twitchHeaders
            }).then(user => {
                req.body = {
                    ...req.body,
                    meta: {
                        streamDate: vidInfo.created_at,
                        followers: user.data.total
                    }
                }
            })
        })
        .catch(err => new AppError(err.response.data.message, err.response.data.status));
    } else { 
        return res.status(400).json({ status: 'fail', message: 'Неопознанная платформа. Поддерживается только Twitch и YouTube'});
    }

    const newVideo = await TwitchWatchlist.create(req.body);

    res.status(201).json({
        status: 'ok',
        message: 'Видео успешно добавлено в список!',
        data: newVideo
    });
});

exports.updateVideo = catchAsync(async (req, res, next) => {
    const { flags, ...body} = req.body
    const updatedVideo = await TwitchWatchlist.findByIdAndUpdate(req.params.id, {
        ...body,
        ...(flags.isShortTerm && { 'flags.isShortTerm': flags.isShortTerm }),
        ...(!flags.isShortTerm && { 'flags.isShortTerm': flags.isShortTerm })
    })

    res.status(200).json({
        status: 'ok',
        data: updatedVideo
    })
})

exports.deleteVideo = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const findChildren = await TwitchWatchlist.find({ relatedTo: id });
    if (findChildren.length) await TwitchWatchlist.deleteMany({ relatedTo: id });

    await TwitchWatchlist.findByIdAndDelete({ _id: id });
    
    res.status(204).json({
        status: 'ok',
        message: 'Видео было успешно удалено из списка просмотра'
    });
});

exports.moveSuggestion = catchAsync(async (req, res, next) => {
    const { id, priority, notes } = req.body;
    await axios.get(`https://api.twitch.tv/helix/videos?id=${id}`, { // get video info
        headers: twitchHeaders
    })
    .then(async resp => {
        const vidInfo = resp.data.data[0];
        const duration = convertDuration(vidInfo.duration);
        const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');

        req.body = {
            priority,
            notes,
            ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url })
        }
    })
    .catch(err => new AppError(err.response.data.message, err.response.data.status));

    await TwitchWatchlist.findOneAndUpdate({ id }, {
        ...req.body,
        $set: {'flags.isSuggestion': false } 
    });

    res.status(200).json({
        status: 'ok',
        data: { message: 'Видео успешно перенесено в список просмотра' }
    });
});

exports.checkVideosAvailability = catchAsync(async (req, res, next) => {
    const list = await TwitchWatchlist.find({ platform: 'Twitch', 'flags.isAvailable': {$ne: false} });
    const currentIds = list.map(vid => vid.id);
    const deletedVideos = [];
    
    await axios.get(`https://api.twitch.tv/helix/videos?id=${currentIds.join(',')}`, {
        headers: twitchHeaders
    })
    .then(resp => {
        let hasDeletedVideos = false;
        const existingIds = resp.data.data.map(vid => vid.id);
        currentIds.map(async id => {
            const video = list.filter(vid => vid.id === id)[0];
            const videoNotAvailable = !existingIds.includes(id);
            if (videoNotAvailable) {
                hasDeletedVideos = true;
                deletedVideos.push(`${video.games[0]} от ${video.author}`);
                await TwitchWatchlist.findOneAndUpdate({ id }, {$set: { 'flags.isAvailable': false }});
            }
        });

        const message = hasDeletedVideos ? `Следующие видео больше недоступны так как были удалены с платформы: ${deletedVideos.join(', ')}` : 'Все актуальные видео доступны для просмотра';
        res.status(200).json({
            status: 'ok',
            data: { 
                message
            }
        });
    });
});