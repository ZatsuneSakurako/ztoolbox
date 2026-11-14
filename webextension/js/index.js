'use strict';

import './panelPort.js';
import './classes/chrome-native.js';
import {getPreference, isNativeConnected} from './classes/chrome-native.js';

import './variousFeatures/contentStyles.js';
import './variousFeatures/contentScripts.js';

import {isFirefox} from "./utils/browserDetect.js";

if ('offscreen' in chrome) {
	chrome.offscreen.createDocument({
		url: chrome.runtime.getURL("offscreen.html"),
		reasons: [ "WORKERS" ],
		justification: "Service worker keepalive workaround"
	}).catch(console.error);

	if (isFirefox) {
		console.warn('%cFIREFOX Offscreen API available', 'font-size: 42px; color: red; font-weight: bold;');
	}
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// If message comes from keep-alive content script
	if (message.type !== "HEARTBEAT") return;

	console.debug("Background woke up! Received update  ", message.data);
	const key = `last_update_${sender.tab.id}`;
	browser.storage.local.set({
		[key]: message.data
	});
	sendResponse({status: "saved"});
});



chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "service_worker_keepalive") {
		console.debug("[DEBUG] Keepalive ping received");
		return;
	}

	if (sender.hasOwnProperty("url")) {
		console.debug(`Receiving message from: ${sender.url} (${sender.id})`, message);
	}

	if (chrome.runtime.id !== sender.id) {
		console.error('Message received from unknown sender id');
	} else if (typeof message === "object" && message.hasOwnProperty("data")) {
		switch (message.id) {
			case "isNativeConnected":
				sendResponse(isNativeConnected());
				return true;
			case "getPreferences":
				try {
					const reply = {};
					for (const prefId of message.data.preferences) {
						reply[prefId] = getPreference(prefId);
					}

					sendResponse({
						"preferences": reply,
					});
				} catch (e) {
					console.error(e);
					sendResponse({
						preferences: {}
					});
				}
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
	]);

	const currentLocalKeys = new Set(await chrome.storage.local.getKeys());
	for (let key of currentLocalKeys) {
		if (localKeyToKeep.has(key)) continue;

		console.warn(`Deleting old preference "${key}"`);
		await chrome.storage.local.remove(key);
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
