# WIP
* i : Move tab mover from context menu to panel
* i : Panel css refactor / fixes
* \+ : PWA install button
* \+ : WIP service worker blocker
* \+ : Add identification to notification to let a new notification "overwrite" the previous same type
* \+ : Move background theme cache to localStorage, instead of keeping it in the background page
* \- : Remove setting to store Twitch client id 

# 0.16.0
* i : Update dependencies
* \- : Remove perfect-scrollbar, now using native scrollbars

# 0.15.0
* \+ : Copy text link / copy tab title
* i : Various fix / cleanup

# 0.14.1
* \Fix : Twitch points selector

# 0.14.0
* \+ : Twitch points
* fix : Amazon share - notification after accepted permission
* fix : Amazon share - better price detection

# 0.13.0
* i : Start using native JavaScript modules. It includes the use of [import](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Statements/import) (static and dynamic) Minimum version Firefox 67 and Chrome 63
* i : Minimum Chrome version 73, because using [String.prototype.matchAll()](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String/matchAll)
* i : deviantArt now use [fetch api](https://developer.mozilla.org/docs/Web/API/Fetch_API)
* \+ : Amazon share link easier, into clipboard
* Fix : RSS/Atom feed detection of links and titles

# 0.12.0
* \+ : Search image with IQDB from context menu
* \- : Delete Twitch content script

# 0.11.3
* Fix : Fix deviantArt update

# 0.11.2
* \- : "Not logged" notification with deviantArt launched every checked
* \- : Twitch channel created will stop working after 13rd of September, avoid unnecessary errors

# 0.11.1
* Fix : New deviantArt support (no folder url yet)

# 0.11.0
* i : Detect RSS links like /feeds/*.xml
* \- : Stop using buttons on notification when it is not necessary
* Fix : Remove spaces from link of RSS links with [trim()](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Global_Objects/String/Trim)

# 0.10.0
* i : Refactor with open without playlist
* Fix : URL with i18next

# 0.9.0
* \+ : RSS Feeds detection

# 0.8.1
* Fix : Link cleaning

# 0.8.0
* Fix : Muted pause

# 0.7.3
* Fix : Twitch now use [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)

# 0.7.2
* \+ : RSS Feeds refresh
* \+ : RSS Feeds messsages
* Fix : Panel - Keep display order between deviantArt and RSS Feed

# 0.7.1
* + : RSS Feeds refresh

# 0.7.0
* \+ : RSS Feeds detection
* \+ : Translation fix

# 0.6.8
* Fix : deviantArt profil url

# 0.6.7
* Fix : Translations
* i : ZDK updates

# 0.6.6
* i : ZDK Loading

# 0.6.5
* i : ZDK updates
* Fix : WIP android support

# 0.6.4
* Fix : Twitch channel created on video page

# 0.6.3
* i : ZDK updates
* Fix : deviantArt if incorrect request answer

# 0.6.2
* Fix : Page context menu wrongly showing Youtube Playlist one
* Fix : Reworked Twitch content script, now supporting channel currently hosting on page load

# 0.6.1
* Fix : Panel no longer able to open tabs

# 0.6.0
* i : Moved function to open tab if not already exist to ZDK
* \+ : Add link in Launchpad index page to go to PPA page
* Fix : ChromePreferences - Export file name
* Fix CSS code style

# 0.5.4
* i : ZDK update
	* \+ : \[ZDK] Promise based setTimeout
	* \+ : \[ZDK] getPageSize to get the page actuel size
	* \+ : \[ZDK] hasTouch to detect pages with touch screen
* Fix : openTabIfNotExist using wrong arguments on [browser.tabs.query()](https://developer.mozilla.org//Add-ons/WebExtensions/API/tabs/query)

# 0.5.3
* i : Use Moment.js to get next hour instead of self made function

# 0.5.2
* Fix : Hourly alarm - Hour formats and definition
* Fix : No sound on notifications, on Firefox (user setting might be required)

# 0.5.1
* Fix : Do not sync hourly alarm sound file

# 0.5.0
* i : ZDK update
	* \+ : \[ZDK] loadBlob can now read as text with a second argument
	* \+ : \[ChromePreferences] Core to import/export from/to file
	* \+ : \[ZDK] Simulate click, now needed by ChromePreferences
	* \+ : \[ChromePreferences] New setting type : File
	* \+ : \[ChromeNotificationController] Sound support on notifications, using [notifications.onShown](https://developer.mozilla.org//Add-ons/WebExtensions/API/notifications/onShown) to begin it, when supported
* Fix : Exclude private windows for windowsContextMenu
* Fix : Hourly alarm - Wrong parameter to define next alarm

# 0.4.0
* i : Moved hourly alarm to a class
* i : Hourly alarm
	* \+ : Vocal notifications
	* Fix : Cleaning hourly alarms before enabling it
	* Fix : Risk of several onAlarm listeners
	* Fix : Respect the globaly disabled notifications state
* Fix : Missing setting to enable vocal notifications
* Fix : Localization of vocal notification language of refresh-data

# 0.3.2
* Fix : Hourly alarm, debug that was not supposed to be commited

# 0.3.1
* Fix : Hourly alarm, Firefox sending undefined with [alarms.get()](https://developer.mozilla.org//Add-ons/WebExtensions/API/alarms/get) if nothing to return

# 0.3.0
* i : Moved "feature" script to a dedicated folder
* \+ : Hourly alarm (disabled by default) using Web Extensions's [alarms](https://developer.mozilla.org//Add-ons/WebExtensions/API/alarms)
* Fix : sendDataToMain id in option page

# 0.2.1
* Fix : Context menu text
* Fix : Refresh limiter

# 0.2.0
* \+ : Open link to other window
* Fix : Moved tab keep its original active state

# 0.1.0
* \+ : Context menu to move a tab of window
* i : ZDK update
	* i : JSDoc added on some functions
	* \+ : ZDK.stringEllipse()

# 0.0.10
* \+ : Update panel data on data refresh end

# 0.0.9
* Fix : deviantArt loading
* Fix : ZDK consoleMsg

# 0.0.8
* Fix : Disable label change on addon button
* Fix : Disable notifications

# 0.0.7
* \+ : Replaced Tooltip system with OpenTip
* \+ : deviantArt notification checking imported from [z-Notifier](https://gitlab.com/ZatsuneNoMokou/znotifier)
* Fix : ZDK Request now use mapToObj from itself

# 0.0.6
* \+ : Twitch channel created (Was formerly a Greasemonkey)

# 0.0.5
* Fix : Addon version display in panel

# 0.0.4
* Fix : Addon auto updater

# 0.0.3
* Fix : Disabled Tooptip, causing strange Firefox behaviour
	* Not shown correctly
	* Other panels from others addons not showing correctly

# 0.0.1-0.0.2
* \+ : Addon auto updater
* i : Initial version