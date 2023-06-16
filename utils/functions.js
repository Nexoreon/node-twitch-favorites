const mongoose = require('mongoose');
const chalk = require('chalk');
const nodeSchedule = require('node-schedule');
const AppError = require('../utils/appError');
const pushNotification = require('./pushNotification');
const Notification = require('../models/notificationModel');

exports.toObjectId = id => mongoose.Types.ObjectId(id);
exports.sendError = (msg, statusCode, next) => next(new AppError(msg, statusCode));

// CREATE APP NOTIFICATION
exports.createNotification = async ntfData => {
    await Notification.create(ntfData)
    .then(() => console.log(chalk.green('[Система уведомлений]: Уведомление успешно добавлено в приложение')))
    .catch(() => console.log(chalk.red('[Система уведомлений]: Ошибка добавления уведомления в приложение')));
};

// SEND DELAYED PUSH NOTIFICATION
exports.sendNotificationLater = ntf => {
    nodeSchedule.scheduleJob(ntf.sendOut, () => {
        pushNotification.publishToInterests(['project'], { // push notification to users
            web: {
                notification: {
                    title: ntf.title,
                    body: ntf.content,
                    deep_link: ntf.link,
                    ...(ntf.image.length || ntf.app.icon && { icon: ntf.image.length ? ntf.image : ntf.app.icon })
                }
            }
        })
        .then(() => console.log('[Pusher]: Уведомление успешно отравлено!'))
        .catch(e => console.log(chalk.red('[Pusher]: Ошибка отправки уведомления!'), e));
    })
    console.log(chalk.blueBright('[Система уведомлений]: Отправка запланирована ' + new Date(ntf.sendOut).toLocaleString()));
};