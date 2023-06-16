const PushNotifications = require('@pusher/push-notifications-server');

let beamsClient = new PushNotifications({
    instanceId: process.env.PUSH_INSTANCE,
    secretKey: process.env.PUSH_KEY
});

module.exports = beamsClient;