'use strict';


import {default as env} from './env.js';
import {getPreference, savePreference} from './options-api.js';

const ZDK = window.ZDK;
window.getPreference = getPreference;
window.savePreference = savePreference;
window.env = env;



appGlobal.notificationGlobalyDisabled = false;

// noinspection JSUnusedLocalSymbols
/**
 *
 * @param {string} source
 * @param {string} id
 * @param {*} data
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
				if (typeof isActivated === "boolean" && getPreference("hourlyAlarm") !== isActivated) {
					if (getPreference("hourlyAlarm") === true) {
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

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
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
				'targetUrlPatterns': targetUrlPatterns_processed,
				'title': title,
				"id": Math.random().toString().substr(2)
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
				"title": title,
				"id": Math.random().toString().substr(2)
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
chrome.contextMenus.onClicked.addListener(function (info, tab) {
	for (let [menuId, data] of contextMenusController) {
		if (info.menuItemId === menuId) {
			try {
				data.onClick(info, tab);
			} catch (e) {
				console.error(e);
			}
		}
	}
});
window.baseRequiredPromise.then(() => {
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

/**
 * @type {ChromeNotificationController}
 */
const chromeNotifications = new zDK.ChromeNotificationController();
/**
 *
 * @param {NotificationOptions} options
 * @param suffixConfirmIfNoButtons
 * @return {Promise<ChromeNotificationControllerObject>}
 */
window.doNotif = function doNotif(options, suffixConfirmIfNoButtons=false){
	return new Promise((resolve, reject) => {
		if (typeof options !== "object" || options === null) {
			reject("Missing argument");
			return null;
		}
		if (!options.title || typeof options.title !== "string" || options.title === "") {
			options.title = browser.runtime.getManifest().name;
		}
		if (!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === "") {
			const manifestIcons = browser.runtime.getManifest().icons;
			let iconSize;
			if (manifestIcons.hasOwnProperty("128")) {
				iconSize = "128";
			} else if (manifestIcons.hasOwnProperty("96")) {
				iconSize = "96";
			} else if (manifestIcons.hasOwnProperty("64")) {
				iconSize = "64";
			} else if (manifestIcons.hasOwnProperty("48")) {
				iconSize = "48";
			} else if (manifestIcons.hasOwnProperty("32")) {
				iconSize = "32";
			}

			if (iconSize !== undefined) {
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
const CHECK_UPDATES_INTERVAL_NAME = 'checkUpdatesInterval',
	CHECK_UPDATES_INTERVAL_DELAY = 10
;
window.baseRequiredPromise.then(async function() {
	if (env !== 'local') {
		// Ignore when not in "local" env

		await browser.alarms.clear(CHECK_UPDATES_INTERVAL_NAME)
			.catch(console.error)
		;
		return;
	}

	let existingAlarm = null;
	try {
		existingAlarm = await browser.alarms.get(CHECK_UPDATES_INTERVAL_NAME);
	} catch (e) {
		console.error(e);
	}

	if (!existingAlarm || existingAlarm.periodInMinutes !== CHECK_UPDATES_INTERVAL_DELAY) {
		console.dir(existingAlarm)
		await browser.alarms.clear(CHECK_UPDATES_INTERVAL_NAME)
			.catch(console.error)
		;
		browser.alarms.create(CHECK_UPDATES_INTERVAL_NAME, {
			'periodInMinutes': CHECK_UPDATES_INTERVAL_DELAY
		});
	}
});

async function onCheckUpdatesInterval() {
	if (env !== 'local') {
		// Ignore when not in "local" env
		return;
	}

	const lastCheck = moment(localStorage.getItem('checkUpdate'));
	if (lastCheck.isValid() === true && moment.duration(moment().diff(lastCheck)).as('hours') < 6) {
		return;
	}

	const hasUpdate = await window.zDK.chromeUpdateNotification.checkHasUpdate();
	localStorage.setItem('checkUpdate_state', !!hasUpdate? '1' : '');
	localStorage.setItem('checkUpdate', (new Date()).toISOString());
	if (hasUpdate === false) {
		return;
	}

	doNotif({
		"title": i18ex._('updateSimple'),
		"message": i18ex._('updateDetail', {
			name: browser.runtime.getManifest().name
		})
	})
		.catch(ZDK.console.error)
	;
}

browser.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === CHECK_UPDATES_INTERVAL_NAME) {
		onCheckUpdatesInterval()
			.catch(console.error)
		;
	}
});
