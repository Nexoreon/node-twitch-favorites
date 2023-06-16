const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');
const { toObjectId, sendError, sendNotificationLater } = require('../utils/functions');
const mongoose = require('mongoose');

const msg404 = 'Такого уведомления не найдено в системе!';
exports.createNotification = catchAsync(async (req, res, next) => {
    const { image, date, sendOut } = req.body;
    const newNotification = await Notification.create({
        ...req.body,
        ...(image && { image: `https://192.168.0.100/site/public/img/${image[0]}` }),
        sendOut: date || sendOut,
        receivers: [toObjectId(process.env.USER_ID)]
    });
    if (sendOut !== Date.now()) sendNotificationLater(req.body);

    res.status(201).json({
        status: 'ok',
        data: newNotification
    });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
    const { userId, archive, limit } = req.query;
    const getQuery = body => Notification.find(body || {});
    let query = getQuery();

    if (userId && archive === 'true') query = getQuery({
        receivers: {$in: toObjectId(userId)}, 
        hiddenFor: {$in: toObjectId(userId)},
        sendOut: {$lte: Date.now()}
    })

    if (userId && archive === 'false') query = getQuery({
        receivers: {$in: toObjectId(userId)}, 
        hiddenFor: {$ne: toObjectId(userId)},
        sendOut: {$lte: Date.now()}
    })

    const notifications = await query.sort({ createdAt: -1 }).limit(limit * 1);
    const total = await Notification.countDocuments({
        receivers: {$in: toObjectId(userId)}, 
        sendOut: {$lte: Date.now()},
    });
    
    const unread = await getQuery({
        receivers: {$in: toObjectId(userId)}, 
        sendOut: {$lte: Date.now()},
        readBy: {$ne: toObjectId(userId)}
    });

    res.status(200).json({
        status: 'ok',
        data: { items: notifications, total: total, unread: unread.length }
    });
});

exports.getNotification = catchAsync(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return sendError(msg404, 404, next);

    res.status(200).json({
        status: 'ok',
        data: notification
    });
});

exports.updateNotification = catchAsync(async (req, res, next) => {
    const { markAsRead, hide, clearAll } = req.query; // all of this options are user id
    const objectId = id => mongoose.Types.ObjectId(id);
    const getQuery = body => Notification.findByIdAndUpdate(req.params.id, body || req.body, {
        new: true
    });

    let query = getQuery();
    if (markAsRead) query = getQuery({
        $addToSet: {readBy: objectId(markAsRead)}
    })

    if (hide) query = getQuery({
        $addToSet: {hiddenFor: objectId(hide)}
    })

    if (clearAll) query = Notification.updateMany(
        { receivers: { $in: objectId(clearAll) } }, 
        { $addToSet: {
            hiddenFor: objectId(clearAll),
            readBy: objectId(clearAll)
        }
    })

    const notification = await query;
    if (!notification) return sendError(msg404, 404, next);

    res.status(200).json({
        status: 'ok',
        data: notification
    });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return sendError(msg404, 404, next);

    res.status(204).json({
        status: 'ok'
    });
});