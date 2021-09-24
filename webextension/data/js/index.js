'use strict';

import {default as env} from './env.js';
import "./lib/browser-polyfill.js";
import "./lib/content-scripts-register-polyfill___modified.js";

import {i18ex} from './translation-api.js';

import {getPreference, getPreferences} from './classes/chrome-preferences-2.js';
import {sendNotification} from './classes/chrome-notification-controller.js';
import {contextMenusController} from './contextMenusController.js';

import {HourlyAlarm} from "./variousFeatures/hourly-alarm.js";
import './variousFeatures/hourly-alarm.js';
import './variousFeatures/iqdb.js';
import './variousFeatures/refresh-data.js';
import './variousFeatures/copyTextLink.js';
import './variousFeatures/service_worker.js';



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
i18ex.loadingPromise.then(() => {
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

	if (chrome.runtime.id !== sender.id) {
		console.error('Message received from unknown sender id');
	} else if (typeof message === "object" && message.hasOwnProperty("data")) {
		switch (message.id) {
			case "getPreferences":
				getPreferences(...message.data.preferences)
					.then(values => {
						let reply = {};
						for (let [prefId, value] of values) {
							reply[prefId] = value;
						}

						sendResponse({
							"preferences": reply
						})
					})
					.catch(err => {
						console.error(err);
						sendResponse({
							preferences: {}
						});
					})
				;
				return true;
			case 'doNotif':
				const options = message.data.options;
				const suffixConfirmIfNoButtons = message.data.suffixConfirmIfNoButtons;

				doNotif(options, suffixConfirmIfNoButtons)
					.then(sendResponse)
					.catch(sendResponse)
				;

				return true;
			case 'hourlyAlarm_update':
				HourlyAlarm.isEnabledHourlyAlarm()
					.then(async function (isActivated) {
						const preference = await getPreference("hourlyAlarm");
						if (typeof isActivated === "boolean" && preference !== isActivated) {
							if (preference === true) {
								await hourlyAlarm.enableHourlyAlarm();
							} else {
								await hourlyAlarm.disableHourlyAlarm();
							}
						}
					})
					.catch(async function (err) {
						console.error(err);
						const preference = await getPreference("hourlyAlarm");
						await hourlyAlarm.disableHourlyAlarm();

						if (preference) {
							await hourlyAlarm.enableHourlyAlarm();
						}
					})
				;
				break;
		}
	}
});

/**
 *
 * @param {NotificationOptions} options
 * @param suffixConfirmIfNoButtons
 * @return {Promise<ChromeNotificationControllerObject>}
 */
window.doNotif = function doNotif(options, suffixConfirmIfNoButtons=false) {
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

		if (suffixConfirmIfNoButtons === true){
			options.title = `${options.title} (${i18ex._("click_to_confirm")})`;
		}

		let customOptions = null;
		if (options.hasOwnProperty("soundObject") && options.hasOwnProperty("soundObjectVolume")) {
			customOptions = {
				"soundObject": options.soundObject,
				"soundObjectVolume": options.soundObjectVolume
			};
			delete options.soundObject;
			delete options.soundObjectVolume;
		}

		sendNotification(options, customOptions)
			.then(result => {
				const {triggeredType, notificationId, buttonIndex} = result;
				console.info(`${notificationId}: ${triggeredType}${(buttonIndex && buttonIndex !== null)? ` (Button index: ${buttonIndex})`:""}`);

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



const CHECK_UPDATES_INTERVAL_NAME = 'checkUpdatesInterval',
	CHECK_UPDATES_INTERVAL_DELAY = 10
;
i18ex.loadingPromise.then(async function() {
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

	const lastCheck = new Date(localStorage.getItem('checkUpdate')),
		durationMinutes = (new Date() - lastCheck) / 60000 // date2 - date1 make milliseconds
	;
	if (!isNaN(durationMinutes) && durationMinutes < 6 * 60) {
		return;
	}

	const {ChromeUpdateNotification} = await import('./classes/chromeUpdateNotification.js');
	const hasUpdate = await ChromeUpdateNotification.checkHasUpdate();
	localStorage.setItem('checkUpdate_state', !!hasUpdate? '1' : '');
	localStorage.setItem('checkUpdate', (new Date()).toISOString());
	if (hasUpdate === false) {
		return;
	}

	doNotif({
		'id': 'updateNotification',
		"title": i18ex._('updateSimple'),
		"message": i18ex._('updateDetail', {
			name: browser.runtime.getManifest().name
		})
	})
		.catch(console.error)
	;
}

browser.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === CHECK_UPDATES_INTERVAL_NAME) {
		onCheckUpdatesInterval()
			.catch(console.error)
		;
	}
});
