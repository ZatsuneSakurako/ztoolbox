'use strict';

import './classes/chrome-native.js';
import {deletePreferences, getPreferences, getPreference, savePreference} from './classes/chrome-preferences.js';

import './variousFeatures/contentStyles.js';
import './variousFeatures/contentScripts.js';

import "./newTab/newTab-background.js";

if ('offscreen' in chrome) {
	chrome.offscreen.createDocument({
		url: chrome.runtime.getURL("offscreen.html"),
		reasons: [ "WORKERS" ],
		justification: "Service worker keepalive workaround"
	}).catch(console.error);
}



chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "service_worker_keepalive") {
		console.debug("[DEBUG] Keepalive ping received");
		return;
	}

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
	const preferences = new Set(['serviceWorkerWhitelist', 'freshRss_showInPanel', 'panel_theme', 'launchpadAddLink', 'custom_lstu_server', '_notificationGloballyDisabled', 'showExperimented', 'showAdvanced', 'check_enabled', 'panel_height', 'panel_width', '_backgroundPage_theme_cache', '_updated', '_websitesDataStore', '_notification', 'mode', '_isVivaldi', 'notification_support', '_backgroundPage_theme_cache']);

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
			console.warn(`Deleting old preference "${prefId}"`);
			await deletePreferences(prefId);
		}
	}

	if ('alarms' in chrome) {
		await chrome.alarms.clearAll()
			.catch(console.error);
	}
}
chrome.runtime.onStartup.addListener(function () {
	onStart_deleteOldPreferences()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	onStart_deleteOldPreferences()
		.catch(console.error)
	;
});
