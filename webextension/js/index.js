'use strict';

import './panelPort.js';
import './classes/chrome-native.js';
import {deletePreferences, getPreferences} from './classes/chrome-preferences.js';

import './variousFeatures/contentStyles.js';
import './variousFeatures/contentScripts.js';

import "./newTab/newTab-background.js";
import {chromeNativeConnectedStorageKey, chromeNativeSettingsStorageKey} from "./classes/chrome-native-settings.js";
import {newTabCapturesStorage, newTabImagesStorage} from "./newTab/newTab-settings.js";

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
	const localKeyToKeep = new Set([
		'chrome_native_token',
		'_checkUpdate',
		'theme',
		'background_color',
		chromeNativeSettingsStorageKey,
		chromeNativeConnectedStorageKey,
		newTabCapturesStorage,
		newTabImagesStorage,
	]);

	const currentLocalKeys = new Set(await chrome.storage.local.getKeys());
	for (let key of currentLocalKeys) {
		if (localKeyToKeep.has(key)) continue;

		console.warn(`Deleting old preference "${key}"`);
		await deletePreferences(key);
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
