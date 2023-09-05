### **JS version is not going to be updated anymore. Check TS version instead**
# node-twitch-favorites

This node application allows you to monitor information about streamers and games they playing, get daily reports and keep your own watchlist of vods. It also gives you ability to send push notifications when your favorite streamer or other streamers play your favorite game. And much more...

The ultimate goal of my personal project is to provide functionality that twitch never provided. It's built on Node.js, Express and MongoDB. The thing you see here is API for the project, UI will be published very soon

### Streamers
Import streamers that you follow in one click and get information which games they are playing, get notified on favorite games and much more...
- Import your follow list in one click
- Get notified when streamer plays your favorite game 
- Get notified when streamer plays a new game (optional)
- Get notified when streamer starts playing next game (optional)
- Automatically updates your follows every 24 hours

### Games
In this section you can easially manage your favorite games, starting from importing them and setting rules such as notifications, required viewers to trigger push and etc.
- Import games that you follow in one click
- Browse history of streamers playing your favorite games
- Add games manually through user friendly UI
- Get notified when your streamers playing your favorite game through push notification or telegram bot
- Optionally get notified when other streamers with required amount of viewers playing your favorite game
- Ability to set min amount of viewers & disable/enable notifications for every imported game

### Reports
Get informative daily reports about games your streamers played
- Application generates report every 24 hours
- Ability to search game or streamer through all available reports
- Ability to see report through web UI, console or through telegram bot
 
### Watchlist
Control your watchlist of vods you wanted to watch later and other youtube videos through user friendly interface
- Add vods from Twitch and YouTube by specifying url of the vod. Vod will be auto imported with required information
- Ability to check if vods that you wanted to watch been deleted
- Playlists "Next" and "Later" to control your watchlist more in depth
- Playlist "Suggestions" will be filled with vods of streamers that played your favorite games (Will be auto added if you enabled notification for game)
- Reminder that allows you to know that soon the vod will be deleted (usually twitch deletes vods after 2 months)
- Set your own priority for every vod

and other small features...
