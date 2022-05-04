const TwitchWatchlist = require('../models/twitchWatchlistModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const axios = require('axios')

const twitchHeaders = {
    'client-id': process.env.TWITCH_CLIENT,
    'Authorization': process.env.TWITCH_TOKEN
}

// converts duration to h:m:s string
const convertDuration = duration => {
    const h = duration.split('h')
    const m = h[1].split('m')
    const s = m[1].split('s')
    const hours = h[0]
    let minutes = m[0]
    let secounds = s[0]
    if (minutes.length !== 2) minutes = `0${m[0]}`
    if (secounds.length !== 2) secounds = `0${s[0]}`
    return `${hours}:${minutes}:${secounds}`
}

exports.getVideo = catchAsync(async (req, res, next) => {
    const video = await TwitchWatchlist.findByIdAndUpdate(req.params.id)
    if (!video) return new AppError("This video doesn't exists", 404)

    res.status(200).json({
        status: 'ok',
        data: video
    })
})

exports.deleteVideo = catchAsync(async (req, res, next) => {
    const video = await TwitchWatchlist.findByIdAndDelete(req.params.id)
    if (!video) return new AppError("This video doesn't exists", 404)

    res.status(204).json({
        status: 'ok'
    })
})

exports.getVideos = catchAsync(async (req, res, next) => {
    const videos = await TwitchWatchlist.find({ 'flags.isSuggestion': false }).sort({ priority: -1 })
    const mnTotal = videos.length

    const suggestions = await TwitchWatchlist.find({ 'flags.isSuggestion': true }).sort({ addedAt: -1 })
    const sgTotal = await TwitchWatchlist.countDocuments({ 'flags.isSuggestion': true })

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
    })
})

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
        await axios.get(`https://api.twitch.tv/helix/videos?id=${videoId}`, { // get video info
            headers: twitchHeaders
        })
        .then(async resp => {
            const vidInfo = resp.data.data[0]
            const duration = convertDuration(vidInfo.duration)
    
            req.body = {
                ...req.body,
                id: videoId,
                platform: 'Twitch',
                title: vidInfo.title,
                author: vidInfo.user_name,
                thumbnail: vidInfo.thumbnail_url,
                duration
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
        return res.status(400).json({ status: 'fail', message: 'Unsupported host! Only Twitch and YouTube currently supported'});
    }

    const newVideo = await TwitchWatchlist.create(req.body);

    res.status(201).json({
        status: 'ok',
        message: 'Video has been successfully added to the watch list',
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

exports.moveSuggestion = catchAsync(async (req, res, next) => {
    const { id, priority, notes } = req.body
    await axios.get(`https://api.twitch.tv/helix/videos?id=${id}`, { // get video info
        headers: twitchHeaders
    })
    .then(async resp => {
        const vidInfo = resp.data.data[0]
        const duration = convertDuration(vidInfo.duration)

        req.body = {
            thumbnail: vidInfo.thumbnail_url,
            duration,
            priority,
            notes
        }
    })
    .catch(err => new AppError(err.response.data.message, err.response.data.status))

    if (!req.body.thumbnail) {
        return res.status(400).json({
            status: 'fail',
            message: 'Error while getting preview image of the vod. The stream is probably not ended yet'
        })
    }

    await TwitchWatchlist.findOneAndUpdate({ id }, {
        ...req.body,
        $set: {'flags.isSuggestion': false } 
    })

    res.status(200).json({
        status: 'ok',
        data: { message: 'Successfully moved suggestion into watchlist' }
    })
})

exports.checkVideosAvailability = catchAsync(async (req, res, next) => {
    const list = await TwitchWatchlist.find({ platform: 'Twitch', 'flags.isAvailable': {$ne: false} }).select({ id: 1 })
    const currentIds = list.map(vid => vid.id)
    
    await axios.get(`https://api.twitch.tv/helix/videos?id=${currentIds.join(',')}`, {
        headers: twitchHeaders
    }).then(resp => {
        let hasDeletedVideos = false
        const existingIds = resp.data.data.map(vid => vid.id)
        currentIds.map(async id => {
            const videoNotAvailable = !existingIds.includes(id)
            if (videoNotAvailable) {
                hasDeletedVideos = true
                await TwitchWatchlist.findOneAndUpdate({ id }, {$set: { 'flags.isAvailable': false }})
            }
        })

        const message = hasDeletedVideos ? 'One or more videos from watchlist are not available anymore' : 'All videos are available to watch'
        res.status(200).json({
            status: 'ok',
            data: { 
                message
            }
        })
    })
})