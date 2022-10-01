'use strict';

import {default as env} from './env.js';
import "./lib/browser-polyfill.js";

import {i18ex} from './translation-api.js';

import './classes/chrome-native.js';
import {getPreference, getPreferences} from './classes/chrome-preferences-2.js';
import {contextMenusController} from './contextMenusController.js';
import {doNotif} from "./doNotif.js";

import {ChromeUpdateNotification} from './classes/chromeUpdateNotification.js';

import './variousFeatures/clear-old-hourly-alarm.js';
import './variousFeatures/iqdb.js';
import './variousFeatures/refresh-data.js';
import './variousFeatures/service_worker.js';
import './variousFeatures/tabPageServerIp.js';

import {isFirefox} from "./browserDetect.js";
import {throttle} from "./lib/throttle.js";
if (isFirefox) {
	import('./variousFeatures/copyTextLink.js')
		.catch(console.error)
	;
}



const updateLstuContextMenu = throttle(async function updateLstuContextMenu() {
	const api_url = await getPreference('custom_lstu_server')
	if (!!api_url && /https?:\/\/.+/.test(api_url)) {
		await import('./variousFeatures/lstu.js');
		self.lstu_onStart_contextMenus()
			.catch(console.error)
		;
	} else {
		for (let id of ['shorten_fromPage','shorten_fromLink','shorten_fromImage']) {
			browser.contextMenus.remove(id);
		}
	}
}, 5000);
updateLstuContextMenu();
browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;

	if (changes.custom_lstu_server) {
		updateLstuContextMenu();
	}
});



async function onStart_contextMenus() {
	await i18ex.loadingPromise;

	contextMenusController.create('OpenWithoutPlaylist', i18ex._("OpenWithoutPlaylist"), ["*.youtube.com/watch?*&list=*","*.youtube.com/watch?list=*"], function (info, tab) {
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
}

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
		}
	}
});



const CHECK_UPDATES_INTERVAL_NAME = 'checkUpdatesInterval',
	CHECK_UPDATES_INTERVAL_DELAY = 10
;
async function onStart_checkUpdates() {
	await i18ex.loadingPromise;

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
}

async function onCheckUpdatesInterval() {
	if (env !== 'local' || isFirefox) {
		// Ignore when not in "local" env
		return;
	}

	const lastCheck = (await browser.storage.local.get(['_checkUpdate']))?._checkUpdate ?? {};
	const lastCheckDate = new Date(lastCheck.checkedAt),
		durationMinutes = (new Date() - lastCheckDate) / 60000 // date2 - date1 make milliseconds
	;
	if (!isNaN(durationMinutes) && durationMinutes < 6 * 60) {
		return;
	}

	const hasUpdate = await ChromeUpdateNotification.checkHasUpdate();
	await browser.storage.local.set({
		_checkUpdate: {
			hasUpdate,
			checkedAt: new Date()
		}
	});
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

chrome.runtime.onInstalled.addListener(function (installReason) {
	let version = chrome.runtime.getManifest().version;
	if (version === installReason.previousVersion) {
		version = '';
	}
	console.log(`onInstalled (${installReason.reason}) ${version}`);
});





chrome.runtime.onStartup.addListener(function () {
	onStart_checkUpdates()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	onStart_checkUpdates()
		.catch(console.error)
	;
});

onStart_contextMenus()
	.catch(console.error)
;
