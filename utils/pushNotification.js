const PushNotifications = require('@pusher/push-notifications-server')
require('dotenv').config({ path: './config1.env'})

let beamsClient = new PushNotifications({
    instanceId: process.env.PUSH_INSTANCE,
    secretKey: process.env.PUSH_KEY
})

module.exports = beamsClient