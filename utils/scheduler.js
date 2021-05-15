const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const nodeScheduler = require('node-schedule')
const chalk = require('chalk')
const Table = require('cli-table')

const scheduler = new ToadScheduler()

const TwitchStreamersApp = require('../apps/TwitchStreamersApp')
const TwitchGamesApp = require('../apps/TwitchGamesApp')
const TwitchStatsApp = require('../apps/TwitchStatsApp')

// Twitch Streamers: Checks every 10 minutes if streamers i follow plays favorite game
const checkStreams = new SimpleIntervalJob({ minutes: 10 }, new Task('checkStreams', TwitchStreamersApp))
scheduler.addSimpleIntervalJob(checkStreams)

// Twitch Games: Checks every 30 minutes for streamers that playing a favorite game from the list of games
const checkGames = new SimpleIntervalJob({ minutes: 30 }, new Task('checkGames', TwitchGamesApp))
scheduler.addSimpleIntervalJob(checkGames)

// Twitch Stats: Checks every 24 hours for streamers stats in stats db and generates daily reports
// const generateTwitchReport = nodeScheduler.scheduleJob({ hour: 18, tz: 'Etc/UTC'}, TwitchStatsApp)