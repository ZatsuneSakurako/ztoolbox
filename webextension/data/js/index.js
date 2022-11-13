'use strict';

import {default as env} from './env.js';
import "./lib/browser-polyfill.js";

import {i18ex} from './translation-api.js';

import './classes/chrome-native.js';
import {deletePreferences, getPreferences, savePreference} from './classes/chrome-preferences-2.js';
import {sendNotification} from "./classes/chrome-notification.js";

import {ChromeUpdateNotification} from './classes/chromeUpdateNotification.js';

import './variousFeatures/clear-old-hourly-alarm.js';
import './variousFeatures/iqdb.js';
import './variousFeatures/refresh-data.js';
import './variousFeatures/tabPageServerIp.js';
import './variousFeatures/youtubePlaylist.js';

import {isFirefox} from "./browserDetect.js";
if (isFirefox) {
	import('./variousFeatures/copyTextLink.js')
		.catch(console.error)
	;
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

		await chrome.alarms.clear(CHECK_UPDATES_INTERVAL_NAME)
			.catch(console.error)
		;
		return;
	}

	let existingAlarm = null;
	try {
		existingAlarm = await chrome.alarms.get(CHECK_UPDATES_INTERVAL_NAME);
	} catch (e) {
		console.error(e);
	}

	if (!existingAlarm || existingAlarm.periodInMinutes !== CHECK_UPDATES_INTERVAL_DELAY) {
		await chrome.alarms.clear(CHECK_UPDATES_INTERVAL_NAME)
			.catch(console.error)
		;
		chrome.alarms.create(CHECK_UPDATES_INTERVAL_NAME, {
			'periodInMinutes': CHECK_UPDATES_INTERVAL_DELAY
		});
	}
}

async function onCheckUpdatesInterval() {
	if (env !== 'local' || isFirefox) {
		// Ignore when not in "local" env
		return;
	}

	const lastCheck = (await chrome.storage.local.get(['_checkUpdate']))?._checkUpdate ?? {};
	const lastCheckDate = new Date(lastCheck.checkedAt),
		durationMinutes = (new Date() - lastCheckDate) / 60000 // date2 - date1 make milliseconds
	;
	if (!isNaN(durationMinutes) && durationMinutes < 6 * 60) {
		return;
	}

	const hasUpdate = await ChromeUpdateNotification.checkHasUpdate();
	await chrome.storage.local.set({
		_checkUpdate: {
			hasUpdate,
			checkedAt: new Date()
		}
	});
	if (hasUpdate === false) {
		return;
	}

	sendNotification({
		'id': 'updateNotification',
		"title": i18ex._('updateSimple'),
		"message": i18ex._('updateDetail', {
			name: chrome.runtime.getManifest().name
		})
	})
		.catch(console.error)
	;
}

chrome.alarms.onAlarm.addListener(function (alarm) {
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





async function onStart_deleteOldPreferences() {
	/**
	 *
	 * @type {Set<string>}
	 */
	const preferences = new Set(['serviceWorkerWhitelist', 'freshRss_showInPanel', 'panel_theme']);
	if (chrome.storage.session) {
		preferences
			.add('_backgroundPage_theme_cache')
			.add('_updated')
			.add('_websitesDataStore')
		;
	}

	await i18ex.loadingPromise;

	for (let prefId of preferences) {
		let hasPreference = false;
		try {
			const val = await chrome.storage.local.get(prefId);
			hasPreference = prefId in val;

			if (!!hasPreference && prefId === 'panel_theme') {
				await savePreference(prefId, val);
			}
		} catch (e) {
			console.error(e);
		}
		if (!!hasPreference) {
			await deletePreferences(prefId);
		}
	}
}
chrome.runtime.onStartup.addListener(function () {
	onStart_checkUpdates()
		.catch(console.error)
	;
	onStart_deleteOldPreferences()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	onStart_checkUpdates()
		.catch(console.error)
	;
	onStart_deleteOldPreferences()
		.catch(console.error)
	;
});
