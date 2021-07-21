const TwitchReport = require('../models/twitchReportModel')
const catchAsync = require('../utils/catchAsync')

exports.getReports = catchAsync(async (req, res, next) => {
    const { offset, max, streamer, game, date } = req.query
    const searchPrms = {
        ...(streamer && {'streams.userName': streamer}),
        ...(game && {'streams.gameName': game}),
        ...(date && {'streams.timestamp': date})
    }
    const reports = await TwitchReport.find(searchPrms).sort({timestamp: -1}).skip(offset * 1).limit(max * 1)
    const total = await TwitchReport.find(searchPrms)

    res.status(200).json({
        status: 'success',
        data: {
            items: reports,
            total: total.length
        }
    })
})