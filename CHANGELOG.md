# WIP
* \- : Remove `*.prod.` system in the release script and remove `klaw-sync` dependency

# 3.0.1
* Fix : Userstyle when nothing available

# 3.0.0
* i : Minimum version Firefox 141
* i : Simplify context menu management
* i : Simplify preference management
* i : Translations cleanup and move to native translations
* i : Simply notify if permission are missing (permission to add using browser interface)
* i : UserScript :
  * Replace context menu with panel button to refresh
  * Replace `dayjs` with custom date functions
  * Experiment applying styles from tab
  * Custom sort
  * New `run-at` value : `panel`
* i : Replace update check with socket update information
* i : Move from Twig templates to [Nunjuck](https://mozilla.github.io/nunjucks/)
* i : Simplify theme
* i : Tab mover and new tab rendered using Nunjuck
* i : Optimize panel loading
* \- : Remove `iqdb` search
* \- : Remove copy text link

# 2.7.0
* i : Move ip and meta rating data to UserScript tab data
* \+ : Nunjuck render using socket
* Fix : Firefox userScripts support
* \- : Remove open-graph data

# 2.6.1
* Fix : Firefox userScripts support

# 2.6.0
* Feat : System to apply scripts to websites

# 2.5.3
* Fix : System to apply styles to websites

# 2.5.2
* Fix : System to apply styles to websites

# 2.5.1
* Fix : System to apply styles to websites

# 2.5.0
* i : Minimum version Firefox 138
* \+ : System to apply styles to websites

# 2.4.0
* i : Minimum version Chrome/Chromium 131
* i : Minimum version Firefox 137
* \+ : Support of the folders in bookmarks first depth in new tab
* \+ : Trigger writing JSON into page variable from [webRequest.onHeadersReceived](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived) instead of [devtools](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools) (Chrome Only)
* Fix : Load new bookmark metadata when loading new tab
* Fix : Lazy loading missing on background image in new tab
* \+ : Fix HTTP status data missing handling

# 2.3.4
* i : Minimum version Firefox 135

# 2.3.3
* Fix : Fix socket response to `openUrl`
* Fix : Better folder name support when using array (bookmark path) in new tab
* \- : Remove QR code

# 2.3.2
* i : Minimum version Chrome/Chromium 130
* i : Minimum version Firefox 134
* Fix : Font on new tab page and devtools section

# 2.3.1
* Fix : Refresh data when getting connected to web socket in new tab

# 2.3.0
* \+ : Setting to display new window button even if there is another window for the tab mover
* \+ : Path-like resolving with bookmarks for new tab, and setting to customize folders to display in new tab

# 2.2.0
* \+ : Capture page system for the new tab page
* \+ : Restore last closed tab button for the new tab page
* \+ : JSON view test in devtools (Chrome Only)
* Fix : Blank with new tab page  

# 2.1.0
* i: Move from `Material Icons` to `Material Symbols`
* \+ : New tab page
* Fix: Better Vivaldi detection for WebSocket (using speed dial and bookmark bar properties)

# 2.0.2
* Fix: Syntax error in Firefox

# 2.0.1
* Fix: WebSocket not connecting in Firefox

# 2.0.0
* i : Replace [Chrome Native Messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging) with a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) managed by [socket.io](https://socket.io)

# 1.20.0
* i : Minimum version Firefox 131 and Chrome 126
* i: Librairies update
* Fix: Fix StyleLint errors

# 1.19.0
* \+ : Better non-200 HTTP status badge handling

# 1.18.1
* Fix : Fix non-200 HTTP status badge on Firefox

# 1.18.0
* i: Use [`navigator.userAgentData.brands`](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API) to get the browser name (native messaging)
* \+ : Base64 image instead of URL to display favicon (external management only)
* \+ : Use action badge to display non-200 HTTP status

# 1.17.0
* \+ : DNS report with DNSlytics
* Fix : Fix DNS Checker icon title
* Fix : Fix DNSlytics icon

# 1.16.0
* \- : Remove feature for YouTube to remove playlist parameter 

# 1.15.1
* \Fix : Get and display page meta rating data on Firefox

# 1.15.0
* \+ : Get and display page meta rating data

# 1.14.0
* i : Changed panel size due to removed elements
* \+ : QRCode generator with Firefox
* \- : Cleaning unused events (chrome runtime)

# 1.13.0
* \+ : Add button in panel to open main section (delegated only)
* \- : Remove "native" tab mover from panel (delegated only)

# 1.12.0
* \i : Equivalent to opening url in another browser in native messaging (closing active tab url)
* Fix : Display of main OpenGraph data

# 1.11.0
* \- : Remove `mode` setting, replaced by an automatic mode (equivalent to delegated mode if connected)

# 1.10.1
* Fix : Native messaging - Send `null` when no window opened/focused

# 1.10.0
* Fix : Display of main OpenGraph data (now external management only)
* Fix : Native messaging - Open url in another browser (avoid loading tab list when not in delegated mode)
* \- : Remove `tabPageServerIp_alias` setting
* \- : Remove option page

# 1.9.0
* \- : Display of main OpenGraph data (now external management only)

# 1.8.0
* \+ : Get and display main OpenGraph data

# 1.7.3
* Fix : Detect if tab url hostname is an ip

# 1.7.2
* Fix : Detect if tab url hostname is an ip

# 1.7.1
* \+ : Add DNS Checker link on errored pages

# 1.7.0
* \+ : Add DNS Checker link with Page IP / Status display

# 1.6.2
* i : Panel size
 
# 1.6.1
* \+ : Chrome native - clear notification

# 1.6.0
* i : Fix Firefox validator warning "Unsafe assignment to outerHTML"
* i : Setting cleanup, and avoid JavaScript rendering
* i : Load `iqdb` only in Firefox
* \- : Remove `appendTo` last argument `document`, not needed anymore
* \- : Remove website data loading
* \- : `JSON5` and `openTabIfNotExist` not needed anymore
* Fix : Avoid native port connexion in panel

# 1.5.0
* \- : Refresh data : Remove websites data (remove display and extension storage) and notification from extension (now external management only)

# 1.4.2
* Fix : Update external state when changing "check enable"

# 1.4.1
* Fix : Syntax error with Firefox

# 1.4.0
* i : Update librairies
* i : Panel height with delegated mode
* \+ : Let external request websites refresh (deviantArt/FreshRSS), using existing "check enable" preference
* \- : Simplified mode (deviantArt/FreshRSS disabled)
* \- : Delete disable notification mode, replace with external notification support
* Fix : tabMover - update on load on Chrome browsers

# 1.3.3
* Fix : tabMover - Auto-close popup with openurl

# 1.3.2
* Fix : tabMover - Fix duplicate items

# 1.3.1
* Fix : Native messaging - Open url in another browser (check error)

# 1.3.0
* \+ : deviantArt - Ignore "tier" notification
* \+ : Native messaging - Open url in another browser
* Fix : Change deviantArt favicon url 

# 1.2.0
* \+ : Native messaging - Change port id and code cleaning

# 1.1.0
* i : Move from Mustache templates to Twig using [twig.js](https://github.com/twigjs/twig.js)
* i : Add DNSlytics link with Page IP / Status display
* \+ : Native messaging - accept showing notifications from native messaging

# 1.0.0
* i : Move to manifest v3, folders rework (remove data folder)
* i : WIP native messaging (timeout system, getPreferences result, theme option renaming)
* i : Move data (deviantArt / FreshRSS, theme cache) to session storage if available
* \+ : Page IP / Status display
* \+ : Simplified mode (deviantArt/FreshRSS disabled)
* \+ : Delegated/External mode (external settings)
* fix : Panel : sizing, tab title overflow
* fix : deviantArt / FreshRSS refresh alarm missing periodic data
* fix : deviantArt - use watch page as data URL
* fix : Preferences - load + import of JSON settings
* \- : Delete browser polyfill
* \- : Delete ZDK
* \- : Delete features :
  * Amazon share
  * FreshRSS iframe mode
  * Launchpad add link
  * Lstu
  * Service worker
  * Setting sync buttons / WIP support Dropbox sync

# 0.20.2
* fix : deviantArt - change login url

# 0.20.1
* fix : Amazon share - price/link detection
* fix : deviantArt - fix data url

# 0.20.0
* \+ : Settings to display or not FreshRss in panel
* \- : Clean old translations
* Fix : FreshRSS with no data (no URL)

# 0.19.0
* \+ : Lstu
* i : Update dependencies

# 0.18.0
* \+ : Fresh RSS
* \- : Clean unused ZDK features
* \- : Delete features :
  * muted-pause
  * RSS links
  * Twitch points
  * untrackMe
  * PWA
  * Hourly Alarm
* i : Copy text link now for Firefox only
* i : Less message dependencies between panel and main
* i : WIP native messaging
* fix : Fix badge refresh

# 0.17.3
* fix : Twitch points - url change detection
* fix : Twitch points - error when no chat

# 0.17.2
* fix : Twitch points selector

# 0.17.1
* fix : Fix background theme cache

# 0.17.0
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
* fix : Twitch points selector

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
* \- : Twitch channel created will stop working after 13th of September, avoid unnecessary errors

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
* \+ : RSS Feeds messages
* Fix : Panel - Keep display order between deviantArt and RSS Feed

# 0.7.1
* + : RSS Feeds refresh

# 0.7.0
* \+ : RSS Feeds detection
* \+ : Translation fix

# 0.6.8
* Fix : deviantArt profile url

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
* Fix : Page context menu wrongly showing YouTube Playlist one
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
	* \+ : \[ZDK] getPageSize to get the current page size
	* \+ : \[ZDK] hasTouch to detect pages with touch screen
* Fix : openTabIfNotExist using wrong arguments on [browser.tabs.query()](https://developer.mozilla.org//Add-ons/WebExtensions/API/tabs/query)

# 0.5.3
* i : Use Moment.js to get next hour instead of self-made function

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
	* Fix : Respect the globally disabled notifications state
* Fix : Missing setting to enable vocal notifications
* Fix : Localization of vocal notification language of refresh-data

# 0.3.2
* Fix : Hourly alarm, debug that was not supposed to be committed

# 0.3.1
* Fix : Hourly alarm, Firefox sending undefined with [`alarms.get()`](https://developer.mozilla.org//Add-ons/WebExtensions/API/alarms/get) if nothing to return

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
* Fix : Disabled Tooltip, causing strange Firefox behaviour
	* Not shown correctly
	* Other panels from others addons not showing correctly

# 0.0.1-0.0.2
* \+ : Addon auto updater
* i : Initial version