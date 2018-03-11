# 0.6.1
* Fix: Panel no longer able to open tabs

# 0.6.0
* i: Moved function to open tab if not already exist to ZDK
* +: Add link in Launchpad index page to go to PPA page
* Fix: ChromePreferences - Export file name
* Fix CSS code style

# 0.5.4
* i: ZDK update
	* +: \[ZDK] Promise based setTimeout
	* +: \[ZDK] getPageSize to get the page actuel size
	* +: \[ZDK] hasTouch to detect pages with touch screen
* Fix: openTabIfNotExist using wrong arguments on [browser.tabs.query()](https://developer.mozilla.org//Add-ons/WebExtensions/API/tabs/query)

# 0.5.3
* i: Use Moment.js to get next hour instead of self made function

# 0.5.2
* Fix: Hourly alarm - Hour formats and definition
* Fix: No sound on notifications, on Firefox (user setting might be required)

# 0.5.1
* Fix: Do not sync hourly alarm sound file

# 0.5.0
* i: ZDK update
	* +: \[ZDK] loadBlob can now read as text with a second argument
	* +: \[ChromePreferences] Core to import/export from/to file
	* +: \[ZDK] Simulate click, now needed by ChromePreferences
	* +: \[ChromePreferences] New setting type: File
	* +: \[ChromeNotificationControler] Sound support on notifications, using [notifications.onShown](https://developer.mozilla.org//Add-ons/WebExtensions/API/notifications/onShown) to begin it, when supported
* Fix: Exclude private windows for windowsContextMenu
* Fix: Hourly alarm - Wrong parameter to define next alarm

# 0.4.0
* i: Moved hourly alarm to a class
* i: Hourly alarm
	* +: Vocal notifications
	* Fix: Cleaning hourly alarms before enabling it
	* Fix: Risk of several onAlarm listeners
	* Fix: Respect the globaly disabled notifications state
* Fix: Missing setting to enable vocal notifications
* Fix: Localization of vocal notification language of refresh-data

# 0.3.2
* Fix: Hourly alarm, debug that was not supposed to be commited

# 0.3.1
* Fix: Hourly alarm, Firefox sending undefined with [alarms.get()](https://developer.mozilla.org//Add-ons/WebExtensions/API/alarms/get) if nothing to return

# 0.3.0
* i: Moved "feature" script to a dedicated folder
* +: Hourly alarm (disabled by default) using Web Extensions's [alarms](https://developer.mozilla.org//Add-ons/WebExtensions/API/alarms)
* Fix: sendDataToMain id in option page

# 0.2.1
* Fix: Context menu text
* Fix: Refresh limiter

# 0.2.0
* +: Open link to other window
* Fix: Moved tab keep its original active state

# 0.1.0
* +: Context menu to move a tab of window
* i: ZDK update
	* i: JSDoc added on some functions
	* +: ZDK.stringEllipse()

# 0.0.10
* +: Update panel data on data refresh end

# 0.0.9
* Fix: deviantArt loading
* Fix: ZDK consoleMsg

# 0.0.8
* Fix: Disable label change on addon button
* Fix: Disable notifications

# 0.0.7
* +: Replaced Tooltip system with OpenTip
* +: deviantArt notification checking imported from [z-Notifier](https://gitlab.com/ZatsuneNoMokou/znotifier)
* Fix: ZDK Request now use mapToObj from itself

# 0.0.6
* +: Twitch channel created (Was formerly a Greasemonkey)

# 0.0.5
* Fix: Addon version display in panel

# 0.0.4
* Fix: Addon auto updater

# 0.0.3
* Fix: Disabled Tooptip, causing strange Firefox behaviour
	* Not shown correctly
	* Other panels from others addons not showing correctly

# 0.0.1-0.0.2
* +: Addon auto updater
* i: Initial version