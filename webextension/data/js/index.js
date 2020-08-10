'use strict';


import {default as env} from './env.js';
import {getPreference, savePreference} from "./options-api.js";
const ZDK = window.ZDK;
window.getPreference = getPreference;
window.savePreference = savePreference;
window.env = env;



appGlobal.notificationGlobalyDisabled = false;

// noinspection JSUnusedLocalSymbols
/**
 *
 * @param source
 * @param id
 * @param data
 */
appGlobal.sendDataToMain = function sendDataToMain(source, id, data) {

	if (source === 'ZToolBox_Panel' && id === 'panel_onload') {
		if (typeof panel__UpdateData === 'function') {
			panel__UpdateData();
		} else {
			ZDK.console.warn('panel__UpdateData not found');
		}
	} else if (source === "ZToolBox_Options" && id === "hourlyAlarm_update") {
		HourlyAlarm.isEnabledHourlyAlarm()
			.then(async function (isActivated) {
				if (typeof isActivated==="boolean" && getPreference("hourlyAlarm") !== isActivated) {
					if(getPreference("hourlyAlarm")===true){
						await hourlyAlarm.enableHourlyAlarm();
					} else {
						await hourlyAlarm.disableHourlyAlarm();
					}
				}
			})
			.catch(async function (err) {
				ZDK.console.error(err);
				await hourlyAlarm.disableHourlyAlarm();

				if (getPreference("hourlyAlarm")) {
					await hourlyAlarm.enableHourlyAlarm();
				}
			})
	}
};

const i18ex = window.i18ex;
let _ = browser.i18n.getMessage;

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
browser.contextMenus.removeAll();
class ContextMenusController extends Map {
	constructor(){
		super();
	}

	_create(title, targetUrlPatterns, onClick, opts) {
		/*if(browser.menu!==undefined && browser.menu !== null){
			// tools_menu is available with it
			console.info("browser.menu available");
		}*/
		if (!(browser.contextMenus !== undefined && browser.contextMenus !== null && typeof browser.contextMenus.create === "function")) {
			return;
		}

		let targetUrlPatterns_processed = [];
		if (Array.isArray(targetUrlPatterns)) {
			targetUrlPatterns.forEach(url => {
				if (/https?:\/\/.*/.test(url)) {
					targetUrlPatterns_processed.push(url);
				} else {
					targetUrlPatterns_processed.push('http://' + url);
					targetUrlPatterns_processed.push('https://' + url);
				}
			})
		} else {
			throw 'targetUrlPattern must be an array';
		}
		const contextData = {
			'onClick': onClick,
			'title': title,
			'targetUrlPatterns': targetUrlPatterns,
			'targetUrlPatterns_processed': targetUrlPatterns_processed
		};



		if (!opts || !opts.contexts || !Array.isArray(opts.contexts)) {
			throw 'MissingContext';
		}
		const contexts = opts.contexts.map(item => item.toUpperCase());

		const srcContexts = [];
		[
			'AUDIO',
			'IMAGE',
			'VIDEO'
		].forEach(type => {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				srcContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		});

		if (srcContexts.length > 0) {
			const contextMenuOpts = Object.assign({
				'enabled': true,
				'onclick': onClick,
				'targetUrlPatterns': targetUrlPatterns_processed,
				'title': title
			}, opts);
			contextMenuOpts.contexts = srcContexts;

			this.set(browser.contextMenus.create(contextMenuOpts), contextData);
		}



		const documentContexts = [];
		[
			'PAGE',
			'TAB'
		].forEach(type => {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				documentContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		});

		if (documentContexts.length > 0) {
			const contextMenuOpts = Object.assign({
				"documentUrlPatterns": targetUrlPatterns_processed,
				"enabled": true,
				"onclick": onClick,
				"title": title
			}, opts);
			contextMenuOpts.contexts = documentContexts;

			this.set(browser.contextMenus.create(contextMenuOpts), contextData);
		}



		if (contexts.length > 0) {
			console.warn(`UnsupportedContexts : ${contexts.join(', ')}`);
		}
	}

	create(title, targetUrlPatterns, onClick) {
		const pageTypeContexts = [];
		if (browser.contextMenus.ContextType.hasOwnProperty("PAGE")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.PAGE)
		}
		if (browser.contextMenus.ContextType.hasOwnProperty("TAB")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.TAB)
		}

		return this._create(title, targetUrlPatterns, onClick, {
			'contexts': pageTypeContexts
		});
	}

	createImage(title, targetUrlPatterns, onClick) {
		return this._create(title, targetUrlPatterns, onClick, {
			'contexts': [
				'image'
			]
		});
	}
}

const contextMenusController = window.contextMenusController = new ContextMenusController();

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
	if (sender.hasOwnProperty("url")) {
		console.debug(`Receiving message from: ${sender.url} (${sender.id})`);
	}
	if (typeof message === "object" && message.hasOwnProperty("data")) {
		if (message.data.id==="getPreferences") {
			let reply = {};
			message.data.preferences.forEach(prefId => {
				reply[prefId] = getPreference(prefId);
			});
			sendResponse({
				"preferences": reply
			})
		}
	}
});

const chromeNotifications = new zDK.ChromeNotificationControler(),
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
window.doNotif = function doNotif(options, suffixConfirmIfNoButtons=false){
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
if (env === 'local') {
	window.zDK.setInterval('checkUpdatesInterval', 10, 'm', async function checkUpdates() {
		const lastCheck = moment(localStorage.getItem('checkUpdate'));
		if (lastCheck.isValid() === true && moment.duration(moment().diff(lastCheck)).as('hours') < 6) {
			return;
		}

		const hasUpdate = await window.zDK.chromeUpdateNotification.checkHasUpdate();
		localStorage.setItem('checkUpdate', (new Date()).toISOString())
		if (hasUpdate === false) {
			return;
		}

		doNotif({
			"title": 'Mise à jour disponible',
			"message": `Une mise à jour de "${browser.runtime.getManifest().name}" est disponible, rafraîchir le dépôt local`
		})
			.catch(ZDK.console.error)
		;
	});
}