# 3.7.1
* i: Minimum version Firefox 148
* i: Minimum version Chrome/Chromium 145
* fix: Theme rework – Fixing some spaces with a CSS reset
* fix: UserScript button spaces
* fix: Nunjucks spelling

# 3.7.0
* +: Theme rework – Better list and buttons
* +: Added a "Clear" option to the recently closed sessions dropdown to remove all recently closed sessions (only supported by Firefox currently)
* i: Cleaning panel styles

# 3.6.1
* fix: Main list width

# 3.6.0
* i: Theme rework
* i: Now use native [util.styleText](https://nodejs.org/api/util.html#utilstyletextformat-text-options) instead of `chalk`
* +: Replace the button to re-open last session by a `select`

# 3.5.0
* i: Minimum version Firefox 147
* i: Upgrade libraries
* +: Add slugify utility function to `znmApi`
* fix: Problem in French with short months in date functions
* -: Remove sass dependency (Using `Material Symbols` CSS file directly)

# 3.4.0
* i: Minimum version Firefox 146
* i: Optimize new tab loading
* i: Optimize panel loading
* i: Refactor panel CSS using [CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Using_CSS_nesting)
* fix: New tab in Chromium browsers

# 3.3.2
* fix: Fix new tab data loading

# 3.3.1
* fix: New tab bookmark rendering before loading data

# 3.3.0
* i: Minimum version Chrome/Chromium 138
* i: Minimum version Firefox 144
* i: New tab bookmark data loading refactoring

# 3.2.1
* fix: `adoptedStyleSheets` support under Firefox

# 3.2.0
* i: Minimum version Chrome/Chromium 137
* i: Minimum version Firefox 143
* i: Firefox [StorageArea.getKeys()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/getKeys) support
* +: Auto-close panel when clicking on tab mover actions
* fix: Accent problem in date functions

# 3.1.0
* i: Minimum version Firefox 142
* +: Allow UserScript to inject style in a classic style tag
* fix: Remove some IDE-related warnings
* -: Remove `*.prod.` system in the release script and remove `klaw-sync` dependency

# 3.0.1
* fix: UserStyle when nothing is available

# 3.0.0
* i: Minimum version Firefox 141
* i: Simplify context menu management
* i: Simplify preference management
* i: Translations cleanup and move to native translations
* i: Notify if permission is missing (permission to add using browser interface)
* i: UserScript :
	* Replace the context menu with a panel button to refresh
	* Replace `dayjs` with custom date functions
	* Experiment applying styles from the tab
	* Custom sort
	* New `run-at` value : `panel`
* i: Replace update check with socket update information
* i: Move from Twig templates to [Nunjucks](https://mozilla.github.io/nunjucks/)
* i: Simplify theme
* i: Tab mover and new tab rendered using Nunjucks
* i: Optimize panel loading
* -: Remove `iqdb` search
* -: Remove the copy text link feature

# 2.7.0
* i: Move ip and meta rating data to UserScript tab data
* +: Nunjucks render using socket
* fix: Firefox userScripts support
* -: Remove open-graph data

# 2.6.1
* fix: Firefox userScripts support

# 2.6.0
* +: System to apply scripts to websites

# 2.5.3
* fix: System to apply styles to websites

# 2.5.2
* fix: System to apply styles to websites

# 2.5.1
* fix: System to apply styles to websites

# 2.5.0
* i: Minimum version Firefox 138
* +: System to apply styles to websites

# 2.4.0
* i: Minimum version Chrome/Chromium 131
* i: Minimum version Firefox 137
* +: Support of the folders in bookmarks first depth in the new tab page
* +: Trigger writing JSON into page variable from [webRequest.onHeadersReceived](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived) instead of [devtools](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools) (Chrome Only)
* fix: Load new bookmark metadata when loading the new tab page
* fix: Lazy loading missing on background image in the new tab page
* +: Fix HTTP status data missing handling

# 2.3.4
* i: Minimum version Firefox 135

# 2.3.3
* fix: Fix socket response to `openUrl`
* fix: Better folder name support when using an array (bookmark path) in the new tab page
* -: Remove QR code

# 2.3.2
* i: Minimum version Chrome/Chromium 130
* i: Minimum version Firefox 134
* fix: Font on new tab page and devtools section

# 2.3.1
* fix: Refresh data when getting connected to a web socket in the new tab page

# 2.3.0
* +: Setting to display a new window button even if there is another window for the tab mover
* +: Path‑like resolving with bookmarks for the new tab page, and setting to customize folders to display in the new tab page

# 2.2.0
* +: Capture page system for the new tab page
* +: Restore the last closed tab button for the new tab page
* +: JSON view test in devtools (Chrome Only)
* fix: Blank with the new tab page

# 2.1.0
* i: Move from `Material Icons` to `Material Symbols`
* +: New tab page
* fix: Better Vivaldi detection for WebSocket (using speed dial and bookmark bar properties)

# 2.0.2
* fix: Syntax error in Firefox

# 2.0.1
* fix: WebSocket not connecting in Firefox

# 2.0.0
* i: Replace [Chrome Native Messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging) with a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) managed by [socket.io](https://socket.io)

# 1.20.0
* i: Minimum version Firefox 131 and Chrome 126
* i: Libraries update
* fix: Fix StyleLint errors

# 1.19.0
* +: Better non-200 HTTP status badge handling

# 1.18.1
* fix: Fix the non-200 HTTP status badge on Firefox

# 1.18.0
* i: Use [`navigator.userAgentData.brands`](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API) to get the browser name (native messaging)
* +: Base64 image instead of URL to display favicon (external management only)
* +: Use action badge to display non-200 HTTP status

# 1.17.0
* +: DNS report with DNSlytics
* fix: Fix DNS Checker icon title
* fix: Fix DNSlytics icon

# 1.16.0
* -: Remove the feature for YouTube to remove the playlist parameter

# 1.15.1
* fix: Get and display page meta-rating data on Firefox

# 1.15.0
* +: Get and display page meta rating data

# 1.14.0
* i: Changed panel size due to removed elements
* +: QRCode generator with Firefox
* -: Cleaning unused events (chrome runtime)

# 1.13.0
* +: Add a button in the panel to open the main section (delegated only)
* -: Remove the "native" tab mover from the panel (delegated only)

# 1.12.0
* i: Equivalent to opening url in another browser in native messaging (closing active tab url)
* fix: Display of the main OpenGraph data

# 1.11.0
* -: Remove `mode` setting, replaced by an automatic mode (equivalent to delegated mode if connected)

# 1.10.1
* fix: Native messaging - Send `null` when no window opened/focused

# 1.10.0
* fix: Display of the main OpenGraph data (now external management only)
* fix: Native messaging – Open url in another browser (avoid loading a tab list when not in delegated mode)
* -: Remove `tabPageServerIp_alias` setting
* -: Remove the option page

# 1.9.0
* -: Display of the main OpenGraph data (now external management only)

# 1.8.0
* +: Get and display the main OpenGraph data

# 1.7.3
* fix: Detect if the tab url hostname is an ip

# 1.7.2
* fix: Detect if the tab url hostname is an ip

# 1.7.1
* +: Add DNS Checker link on errored pages

# 1.7.0
* +: Add a DNS Checker link with Page IP / Status display

# 1.6.2
* i: Panel size

# 1.6.1
* +: Chrome native - clear notification

# 1.6.0
* i: Fix Firefox validator warning "Unsafe assignment to outerHTML"
* i: Setting cleanup, and avoid JavaScript rendering
* i: Load `iqdb` only in Firefox
* -: Remove `appendTo` last argument `document`, not needed anymore
* -: Remove website data loading
* -: `JSON5` and `openTabIfNotExist` not needed anymore
* fix: Avoid native port connexion in panel

# 1.5.0
* -: Refresh data – Remove websites data (remove display and extension storage) and notification from extension (now external management only)

# 1.4.2
* fix: Update the external state when changing "check enable"

# 1.4.1
* fix: Syntax error with Firefox

# 1.4.0
* i: Update librairies
* i: Panel height with delegated mode
* +: Let external request websites refresh (deviantArt/FreshRSS), using existing "check enable" preference
* -: Simplified mode (deviantArt/FreshRSS disabled)
* -: Delete disable notification mode, replace with external notification support
* fix: tabMover - update on load event on Chrome browsers

# 1.3.3
* fix: tabMover - Auto-close popup with `openurl`

# 1.3.2
* fix: tabMover - Fix duplicate items

# 1.3.1
* fix: Native messaging – Open url in another browser (check error)

# 1.3.0
* +: deviantArt - Ignore "tier" notification
* +: Native messaging – Open url in another browser
* fix: Change deviantArt favicon url

# 1.2.0
* +: Native messaging – Change port id and code cleaning

# 1.1.0
* i: Move from Mustache templates to Twig using [twig.js](https://github.com/twigjs/twig.js)
* i: Add DNSlytics link with Page IP / Status display
* +: Native messaging – accept showing notifications from native messaging

# 1.0.0
* i: Move to manifest v3, folders rework (remove data folder)
* i: WIP native messaging (timeout system, getPreferences result, theme option renaming)
* i: Move data (deviantArt / FreshRSS, theme cache) to session storage if available
* +: Page IP / Status display
* +: Simplified mode (deviantArt/FreshRSS disabled)
* +: Delegated/External mode (external settings)
* fix: Panel – sizing, tab title overflow
* fix: deviantArt / FreshRSS refresh alarm missing periodic data
* fix: deviantArt - use watch page as data URL
* fix: Preferences - load and import of JSON settings
* -: Delete browser polyfill
* -: Delete ZDK
* -: Delete features :
	* Amazon share
	* FreshRSS iframe mode
	* Launchpad add link
	* Lstu
	* Service worker
	* Setting sync buttons / WIP support Dropbox sync

# 0.20.2
* fix: deviantArt - change login url

# 0.20.1
* fix: Amazon share - price/link detection
* fix: deviantArt - fix data url

# 0.20.0
* +: Settings to display or not FreshRSS in a panel
* -: Clean old translations
* fix: FreshRSS with no data (no URL)

# 0.19.0
* +: Lstu
* i: Update dependencies

# 0.18.0
* +: Fresh RSS
* -: Clean unused ZDK features
* -: Delete features :
	* muted-pause
	* RSS links
	* Twitch points
	* untrackMe
	* PWA
	* Hourly Alarm
* i: `Copy text link` now for Firefox only
* i: Fewer message dependencies between panel and main
* i: WIP native messaging
* fix: Fix badge refresh

# 0.17.3
* fix: Twitch points - url change detection
* fix: Twitch points - error when no chat

# 0.17.2
* fix: Twitch points selector

# 0.17.1
* fix: Fix background theme cache

# 0.17.0
* i: Move tab mover from context menu to panel
* i: Panel css refactor / fixes
* +: PWA install button
* +: WIP service worker blocker
* +: Add identification to notification to let a new notification "overwrite" the previous same type
* +: Move background theme cache to localStorage, instead of keeping it in the background page
* -: Remove setting to store Twitch client id

# 0.16.0
* i: Update dependencies
* -: Remove perfect-scrollbar, now using native scrollbars

# 0.15.0
* +: `Copy text link` / copy tab title
* i: Various fix / cleanup

# 0.14.1
* fix: Twitch points selector

# 0.14.0
* +: Twitch points
* fix: Amazon share – notification after accepted permission
* fix: Amazon share – better price detection

# 0.13.0
* i: Start using native JavaScript modules. It includes the use of [import](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Statements/import) (static and dynamic) Minimum version Firefox 67 and Chrome 63
* i: Minimum Chrome version 73, because using [String.prototype.matchAll()](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String/matchAll)
* i: deviantArt now use [fetch api](https://developer.mozilla.org/docs/Web/API/Fetch_API)
* +: Amazon share link easier, into clipboard
* fix: RSS/Atom feed detection of links and titles

# 0.12.0
* +: Search image with IQDB from a context menu
* -: Delete the Twitch content script

# 0.11.3
* fix: Fix deviantArt update

# 0.11.2
* -: "Not logged" notification with deviantArt launched every checked
* -: Twitch channel created will stop working after the 13th of September, avoid unnecessary errors

# 0.11.1
* fix: New deviantArt support (no folder url yet)

# 0.11.0
* i: Detect RSS links like /feeds/*.xml
* -: Stop using buttons on notification when it is not necessary
* fix: Remove spaces from the link of RSS links with [trim()](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Global_Objects/String/Trim)

# 0.10.0
* i: Refactor with open without a playlist
* fix: URL with i18next

# 0.9.0
* +: RSS Feeds detection
