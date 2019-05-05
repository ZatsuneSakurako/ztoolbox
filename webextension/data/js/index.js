'use strict';

appGlobal.notificationGlobalyDisabled = false;

appGlobal.sendDataToMain = function(source, id, data){
	console.dir([
		source,
		id,
		data
	]);

	if(source==="ZToolBox_Panel" && id==="panel_onload"){
		if(typeof panel__UpdateData==="function"){
			panel__UpdateData();
		} else {
			console.warn("panel__UpdateData not found");
		}
	} else if(source==="ZToolBox_Options" && id==="hourlyAlarm_update"){
		HourlyAlarm.isEnabledHourlyAlarm()
			.then(async function (isActivated) {
				if(typeof isActivated==="boolean" && getPreference("hourlyAlarm")!==isActivated){
					if(getPreference("hourlyAlarm")===true){
						await hourlyAlarm.enableHourlyAlarm();
					} else {
						await hourlyAlarm.disableHourlyAlarm();
					}
				}
			})
			.catch(async function (err) {
				consoleMsg("warn", err);
				await hourlyAlarm.disableHourlyAlarm();

				if(getPreference("hourlyAlarm")){
					await hourlyAlarm.enableHourlyAlarm();
				}
			})
	}
};

let _ = browser.i18n.getMessage;

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
browser.contextMenus.removeAll();
class ContextMenusController extends Map {
	constructor(){
		super();
	}

	create(title, targetUrlPatterns, onClick){
		/*if(browser.menu!==undefined && browser.menu !== null){
			// tools_menu is available with it
			console.info("browser.menu available");
		}*/
		if (browser.contextMenus !== undefined && browser.contextMenus !== null && typeof browser.contextMenus.create === "function") {
			let targetUrlPatterns_processed = [];
			if(Array.isArray(targetUrlPatterns)){
				targetUrlPatterns.forEach(url=>{
					if(/https?:\/\/.*/.test(url)){
						targetUrlPatterns_processed.push(url);
					} else {
						targetUrlPatterns_processed.push("http://"+url);
						targetUrlPatterns_processed.push("https://"+url);
					}
				})
			} else {
				throw "targetUrlPattern must be an array";
			}


			const contextData = {
				"title": title,
				"targetUrlPatterns": targetUrlPatterns,
				"onClick": onClick,
				"targetUrlPatterns_processed": targetUrlPatterns_processed
			};

			this.set(browser.contextMenus.create({
				"contexts": [
					"link"
				],
				"targetUrlPatterns": targetUrlPatterns_processed,
				"enabled": true,
				"onclick": onClick,
				"title": title
			}), contextData);



			const pageTypeContexts = [];
			if(browser.contextMenus.ContextType.hasOwnProperty("PAGE")){
				pageTypeContexts.push(browser.contextMenus.ContextType.PAGE)
			}
			if(browser.contextMenus.ContextType.hasOwnProperty("TAB")){
				pageTypeContexts.push(browser.contextMenus.ContextType.TAB)
			}

			if(pageTypeContexts.length>0){
				this.set(browser.contextMenus.create({
					"contexts": pageTypeContexts,
					"documentUrlPatterns": targetUrlPatterns_processed,
					"enabled": true,
					"onclick": onClick,
					"title": title
				}), contextData);
			}
		}
	}
}

const contextMenusController = new ContextMenusController();

contextMenusController.create(i18ex._("OpenWithoutPlaylist"), ["*.youtube.com/watch?*&list=*","*.youtube.com/watch?list=*"], function (info, tab) {
	const removePlaylistFromUrl = url => {
		const urlObj = new URL(url); // https://developer.mozilla.org/en-US/docs/Web/API/URL - https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
		urlObj.searchParams.delete("list");
		urlObj.searchParams.delete("index");
		return urlObj.toString();
	};

	if (info.hasOwnProperty("linkUrl")) {
		browser.tabs.create({ "url": removePlaylistFromUrl(info.linkUrl) })
			.catch(console.error)
		;
	} else {
		browser.tabs.update(tab.id, {
			"url": removePlaylistFromUrl(tab.url)
		})
			.catch(console.error)
		;
	}
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if(sender.hasOwnProperty("url")){
		console.info(`Receiving message from: ${sender.url} (${sender.id})`);
	}
	if(typeof message === "object" && message.hasOwnProperty("data")){
		if(message.data.id==="getPreferences"){
			let reply = {};
			message.data.preferences.forEach(prefId=>{
				reply[prefId] = getPreference(prefId);
			});
			sendResponse({
				"preferences": reply
			})
		}
	}
});

const chromeNotifications = new ChromeNotificationControler(),
	notifButtons = {
		"openUrl": {title: i18ex._("Open_in_browser"), iconUrl: "/data/images/ic_open_in_browser_black_24px.svg"},
		"close": {title: i18ex._("Close"), iconUrl: "/data/images/ic_close_black_24px.svg"},
		"addItem": {title: i18ex._("Add"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"deleteItem": {title: i18ex._("Delete"), iconUrl: "/data/images/ic_delete_black_24px.svg"},
		"cancel": {title: i18ex._("Cancel"), iconUrl: "/data/images/ic_cancel_black_24px.svg"},
		"yes": {title: i18ex._("Yes"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"no": {title: i18ex._("No"), iconUrl: "/data/images/ic_cancel_black_24px.svg"}
	}
;
function doNotif(options, suffixConfirmIfNoButtons=false){
	return new Promise((resolve, reject)=>{
		if(typeof options !== "object" || options === null){
			reject("Missing argument");
			return null;
		}
		if(!options.title || typeof options.title !== "string" || options.title === ""){
			options.title = browser.runtime.getManifest().name;
		}
		if(!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === ""){
			const manifestIcons = browser.runtime.getManifest().icons;
			let iconSize;
			if(manifestIcons.hasOwnProperty("128")){
				iconSize = "128";
			} else if(manifestIcons.hasOwnProperty("96")){
				iconSize = "96";
			} else if(manifestIcons.hasOwnProperty("64")){
				iconSize = "64";
			} else if(manifestIcons.hasOwnProperty("48")){
				iconSize = "48";
			} else if(manifestIcons.hasOwnProperty("32")){
				iconSize = "32";
			}

			if(iconSize!==undefined){
				options.iconUrl = manifestIcons[iconSize];
			}
		}

		if(suffixConfirmIfNoButtons === true){
			options.title = `${options.title} (${i18ex._("click_to_confirm")})`;
		}

		let customOptions = null;
		if(options.hasOwnProperty("soundObject") && options.hasOwnProperty("soundObjectVolume")){
			customOptions = {
				"soundObject": options.soundObject,
				"soundObjectVolume": options.soundObjectVolume
			};
			delete options.soundObject;
			delete options.soundObjectVolume;
		}

		chromeNotifications.send(options, customOptions)
			.then(result => {
				const {triggeredType, notificationId, buttonIndex} = result;
				console.info(`${notificationId}: ${triggeredType}${(buttonIndex && buttonIndex !== null)? ` (Button index: ${buttonIndex})`:""}`);

				console.dir(buttonIndex)
				// 0 is the first button, used as button of action
				if ((buttonIndex === null || buttonIndex === 0)) {
					resolve(result);
				} else {
					reject(result);
				}
			})
			.catch(err => {
				reject(err);
			})
		;
	});
}
appGlobal["doNotif"] = doNotif;




appGlobal["version"] = browser.runtime.getManifest().version;