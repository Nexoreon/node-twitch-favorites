const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now
    },
    sendOut: {
        type: Date,
        required: [true, 'Необходимо указать дату отправки уведомления']
    },
    title: {
        type: String,
        required: [true, 'Необходимо указать заголовок уведомления']
    },
    content: {
        type: String,
        required: [true, 'Необходимо указать содержимое уведомления']
    },
    image: String,
    link: String,
    receivers: [mongoose.Types.ObjectId],
    readBy: [mongoose.Types.ObjectId],
    hiddenFor: [mongoose.Types.ObjectId]
});

const Notification = mongoose.model('th_notifcations', notificationSchema);

module.exports = Notification;
