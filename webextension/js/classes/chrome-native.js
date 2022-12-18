import {randomId} from "../utils/randomId.js";
import {getSyncKeys} from "./chrome-preferences.js";
import {chromeNativeSettingsStorageKey, getElectronSettings} from "./chrome-native-settings.js";
import {sendNotification} from "./chrome-notification.js";
import {theme_update} from "./backgroundTheme.js";

const port = chrome.runtime.connectNative('eu.zatsunenomokou.chromenativebridge');

port.onMessage.addListener(function(msg) {
	if (location.pathname.endsWith('panel.html') || location.pathname.endsWith('options.html')) {
		console.debug('Ignoring chromeNative incoming messages');
		return;
	}
	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}

	switch (msg.type ?? null) {
		case 'ws open':
			console.log('[NativeMessaging]', 'ws open', msg);
			sendSocketData()
				.catch(console.error)
			;

			getSyncAllowedPreferences()
				.catch(console.error)
			;

			break;
		case 'ws close':
			console.log('[NativeMessaging]', 'ws close', msg);
			break;
		case "log":
			console.log('[NativeMessaging] log', msg.data);
			break;
		case 'ping':
			port.postMessage({
				type: 'commandReply',
				_id: msg._id
			});
			break;
		case 'sendNotification':
			handleSendNotification(msg._id, msg.opts)
				.catch(console.error)
			;
			break;
		case 'commandReply':
			break;
		case 'onSettingUpdate':
			updateSyncAllowedPreferences(msg.data)
				.catch(console.error)
			;
			break;
		default:
			console.log('[NativeMessaging]', 'Unknown type', msg);
	}
});


chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area !== "local") return;

	if ("mode" in changes || "notification_support" in changes) {
		sendSocketData()
			.catch(console.error)
		;
	}
});

async function sendSocketData() {
	const values = await chrome.storage.local.get(['notification_support', 'mode']);
	port.postMessage({
		type: 'updateSocketData',
		data: {
			notificationSupport: values.mode === 'delegated' && values.notification_support === true,
			userAgent: navigator.userAgent,
			extensionId: chrome.runtime.id
		}
	});
}

async function handleSendNotification(id, opts) {
	await sendNotification({
		...opts,
		id: 'chromeNative-' + id
	}, {
		onClickAutoClose: false,
		onButtonClickAutoClose: false
	});
}
chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'close',
			byUser
		}
	});
});
chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'action',
			index: buttonIndex
		}
	});
});
chrome.notifications.onClicked.addListener(async function (notificationId) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'click'
		}
	});
});

/**
 * Return the generated message id
 * @param {string} command
 * @param {any[]} data
 * @return {string}
 */
function callNative(command, ...data) {
	const _id = randomId();
	port.postMessage({
		_id,
		data: data.length === 0 ? undefined : data,
		type: command
	});
	return _id;
}

const timeout = 5000;
/**
 *
 * @see callNative
 * @param {string} command
 * @param {...any[]} data
 * @return {Promise<unknown>}
 */
function fnNative(command, ...data) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, ...data);

		const timerId = setTimeout(() => {
			port.onMessage.removeListener(callback);
			reject(new Error('TIMEOUT'));
		}, timeout);

		const callback = function callback(msg, port) {
			if (msg.type !== "commandReply" || msg._id !== _id) return;

			clearTimeout(timerId);
			port.onMessage.removeListener(callback);

			if (!!msg.error) {
				reject(msg);
			} else if (msg.result) {
				resolve(msg.result);
			} else {
				reject(new Error('UnexpectedMessage'));
			}
		};
		port.onMessage.addListener(callback);
	});
}



export async function ping() {
	try {
		await fnNative('ping');
		console.info('[NativeMessaging] pong');
	} catch (e) {
		console.error(e);
	}
}
self.ping = ping;

/**
 *
 * @param {string} id
 * @return {Promise<*>}
 */
export async function getPreference(id) {
	const {result} = await fnNative('getPreference', id);
	return result.value;
}

/**
 *
 * @param {string[]} ids
 * @return {Promise<Map<string, undefined|*>>}
 */
export async function getPreferences(ids) {
	const {result} = await fnNative('getPreferences', ids);

	const output = new Map();
	for (let {id, value} of result) {
		output.set(id, value);
	}
	return output;
}



async function getSyncAllowedPreferences() {
	const ids = getSyncKeys(),
		output = {},
		newPreferences = await getPreferences(ids)
	;

	for (let [id, value] of newPreferences) {
		if (value === undefined) continue;
		output[id] = value;
	}

	await chrome.storage.local.set({
		[chromeNativeSettingsStorageKey]: output
	});
}
async function updateSyncAllowedPreferences(data) {
	const ids = getSyncKeys(),
		isSync = ids.includes(data.id)
	;

	if (!data.id) {
		return;
	}

	console.log(`[NativeMessaging] onSettingUpdate${isSync ? ' (Sync included)' : ''}`, data);
	if (!isSync) {
		return;
	}

	const {id, newValue} = data,
		currentPreferences = await getElectronSettings()
	;
	if (newValue === undefined) {
		delete currentPreferences[id];
	} else {
		currentPreferences[id] = newValue;
	}

	await chrome.storage.local.set({
		[chromeNativeSettingsStorageKey]: currentPreferences
	});
}



/**
 *
 * @param {Dict<WebsiteData>} websitesData
 * @return {Promise<void>}
 */
export async function sendWebsitesData(websitesData) {
	return callNative('sendWebsitesData', websitesData);
}

/**
 *
 * @return {Promise<*[]>}
 */
export async function getDefaultValues() {
	const {result} = await fnNative('getDefaultValues');
	return result;
}
self.getDefaultValues = getDefaultValues;

/**
 *
 * @param {string} sectionName
 * @return {Promise<*>}
 */
export async function showSection(sectionName) {
	const {result} = await fnNative('showSection', sectionName);
	return result;
}
