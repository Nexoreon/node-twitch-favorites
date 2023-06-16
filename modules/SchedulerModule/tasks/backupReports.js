const TwitchReport = require('../../../models/twitchReportModel');
const TwitchReportBackup = require('../../../models/twitchReportBackupModel');
const chalk = require('chalk');

createBackupReports = async () => {
    console.log(chalk.yellow('[Twitch Reports]: Запуск создания бэкапа отчётов...'));
    let hasAnomaly = false;
    const reports = await TwitchReport.count();
    if (reports < 10) hasAnomaly = true;

    if (!hasAnomaly) {
        const reports = await TwitchReport.find();
        await TwitchReportBackup.deleteMany();
        await TwitchReportBackup.insertMany(reports);
        console.log(chalk.yellow('[Twitch Reports]: Создания бэкапа отчётов успешно завершено!'));
    } else {
        console.log(chalk.red('[Twitch Reports]: Обнаружена аномалия! Создания бэкапа отчётов невозможно'));
    }
};

module.exports = createBackupReports;