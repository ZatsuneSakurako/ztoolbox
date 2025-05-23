import {randomId} from "../utils/randomId.js";
import {getSyncKeys} from "./chrome-preferences.js";
import {
	chromeNativeSettingsStorageKey,
	chromeNativeConnectedStorageKey,
	getElectronSettings
} from "./chrome-native-settings.js";
import {sendNotification} from "./chrome-notification.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";
import {tabPageServerIpStorage} from "../variousFeatures/tabPageServerIp.js";
import ipRegex from "../../lib/ip-regex.js";
import {io} from "../../lib/socket.io.esm.min.js";
import {isServiceWorker} from "../utils/browserDetect.js";
import {updateStyles} from "../variousFeatures/contentStyles.js";
import {contentScripts} from "../variousFeatures/contentScripts.js";


/**
 *
 * @type {string|null}
 */
let chrome_native_token = null;
const socket = io('ws://localhost:42080', {
	reconnectionDelay: 2000,
	reconnectionDelayMax: 10000,
	randomizationFactor: 1, // Not needed, only local server
	query: {
		get token() {
			return chrome_native_token ?? undefined
		}
	},
	transports: ['websocket'],
	autoConnect: false
});

let initLaunched = false;
async function init() {
	if (initLaunched) return;
	initLaunched = true;

	let haveBackgroundPage = false;
	if (typeof chrome.runtime.getBackgroundPage === 'function') {
		try {
			await chrome.runtime.getBackgroundPage();
			haveBackgroundPage = true;
		} catch (e) {
			console.debug(e)
		}
	}
	if (haveBackgroundPage) {
		/*
		 * TODO clean when Firefox support real manifest v3
		 * If background page present, then running in Firefox without full manifest v3 support
		 */
		if (location.pathname.endsWith('panel.html')) {
			console.debug('Ignoring "chromeNative" websocket');
			return;
		}
	}


	chrome_native_token = (await chrome.storage.local.get([
		'chrome_native_token',
	]))?.chrome_native_token ?? null;
	if (chrome_native_token) {
		socket.connect();
	} else {
		console.error('[chrome-native]', 'Missing token !');
	}
	setInterval(() => {
		socket.emit('ping', function (reply) {
			if (reply.error || reply.result !== 'pong') {
				console.error('[ping]', reply)
			}
		});
	}, 10000);
}

chrome.runtime.onStartup.addListener(() => {
	init()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(() => {
	init()
		.catch(console.error)
	;
});
if (!isServiceWorker) {
	init()
		.catch(console.error)
	;
}



socket.on('connect', function () {
	console.info('[ws open]', 'WEBSOCKET_OPENED: client connected to server');
});

socket.on('connect_error', function (err) {
	console.error('[ws error]', 'Socket encountered error: ' + err.message);
});

socket.on('ws open', function (err) {
	console.log('[NativeMessaging]', 'ws open', err);

	chrome.storage.session.set({
		[chromeNativeConnectedStorageKey]: true
	})
		.catch(console.error)
	;

	sendSocketData()
		.catch(console.error)
	;

	getSyncAllowedPreferences()
		.catch(console.error)
	;

	updateStyles()
		.catch(console.error);
});

socket.on('disconnect', function (reason, description) {
	console.log('[NativeMessaging]', 'ws close', reason, description);

	chrome.storage.session.set({
		[chromeNativeConnectedStorageKey]: false
	})
		.catch(console.error)
	;
});

socket.on('log', function (...args) {
	console.log('[NativeMessaging] log', ...args);
});



socket.on('ping', function (cb) {
	cb({
		error: false,
		result: 'pong'
	});
});

/**
 *
 * @type {Map<string, (data) => void>}
 */
const notificationCbMap = new Map();
socket.on('sendNotification', (opts, cb) => {
	const _id = randomId();
	const callback = (data) => {
		notificationCbMap.delete(_id);
		socket.off('clearNotifications', _clearNotification);
		if (timer) {
			clearTimeout(timer);
		}
		if (!!data) {
			cb({
				error: false,
				result: data
			});
		}
	};
	notificationCbMap.set(_id, callback);
	handleSendNotification(_id, opts)
		.catch(err => {
			console.error(err);
			callback();
		})
	;

	const _clearNotification = () => {
		clearNotification(_id)
			.catch(console.error)
		;
	};

	let timer = null;
	if (opts.timeoutType === 'default') {
		timer = setTimeout(_clearNotification, 2 * 60000); // 2min
	}
	socket.on('clearNotifications', _clearNotification);
});

socket.on('openUrl', (url, cb) => {
	if (!url) {
		return;
	}

	(async () => {
		const tab = await chrome.tabs.create({
			url: url,
			active: true
		})
			.catch(console.error)
		;
		cb({
			error: !tab
		});
	})();
});

socket.on('closeActiveUrl', async (url) => {
	const activeTab = await getCurrentTab()
		.catch(console.error)
	;
	console.log('[NativeMessaging]', 'closeActiveUrl type', activeTab.url);
	if (url && activeTab.url === url) {
		await chrome.tabs.remove(activeTab.id)
			.catch(console.error)
		;
	}
});

socket.on('onSettingUpdate', function (preference) {
	updateSyncAllowedPreferences(preference)
		.catch(console.error)
	;
});





chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area === 'session' && tabPageServerIpStorage in changes) {
		sendSocketData()
			.catch(console.error)
		;
		return;
	}

	if (area !== "local") return;

	if ("notification_support" in changes) {
		sendSocketData()
			.catch(console.error)
		;
	}
});

chrome.windows.onFocusChanged.addListener(async function onFocusChanged(windowId) {
	const window = await chrome.windows.get(windowId)
		.catch(console.error)
	;
	if (!window) {
		console.warn('[sendSocketData] UNREACHABLE_ACTIVE_TAB')
		await sendSocketData()
			.catch(console.error)
		;
		return;
	}
	if (window.type !== 'normal') {
		return;
	}

	const tabs = await chrome.tabs.query({
		windowId
	})
		.catch(console.error)
	;
	if (!tabs.length) {
		return;
	}
	// chrome.windows.onFocusChanged.removeListener(onFocusChanged);



	await sendSocketData()
		.catch(console.error)
	;
});
chrome.tabs.onActivated.addListener(async function onFocusChanged(windowId) {
	await sendSocketData()
		.catch(console.error)
	;
});

export async function getBrowserName() {
	if (!!navigator?.userAgentData) {
		const searchedBrands = new Set(['vivaldi', 'firefox', 'opera', 'brave'])
		const browserBrand = navigator.userAgentData.brands
			.find(uaBrandData => searchedBrands.has(uaBrandData.brand.toLowerCase()))
		;
		if (browserBrand) {
			return `${browserBrand.brand} ${browserBrand.version ?? ''}`;
		}
	}

	const firstBookmark = (await chrome.bookmarks.getTree()).at(0);
	let browserName;
	/**
	 * Properties "speeddial" and "bookmarkbar" should only exist in Vivaldi
	 */
	if (firstBookmark.speeddial !== undefined && firstBookmark.bookmarkbar !== undefined) {
		browserName = 'Vivaldi';
	} else {
		const firefox = navigator.userAgent.split(' ')
			.find(str => str.toLowerCase().startsWith('firefox'))
		;
		if (firefox) {
			browserName = firefox.replace('/', ' ')
		} else {
			const chrome = navigator.userAgentData.brands
				.find(data => data.brand.toLowerCase() === 'chromium')
			;
			const edge = navigator.userAgentData.brands
				.find(data => data.brand.toLowerCase() === 'microsoft edge')
			;
			if (edge) {
				browserName = `MS Edge ${edge?.version ?? ''}`.trim();
			} else {
				browserName = `Chrome ${chrome?.version ?? ''}`.trim();
			}
		}
	}
	return browserName;
}

async function sendSocketData() {
	const values = await chrome.storage.local.get([
		'notification_support',
	]);

	let tabData = null;
	const activeTab = await getCurrentTab()
		.catch(console.error)
	;
	if (activeTab) {
		const raw = (await chrome.storage.session.get([tabPageServerIpStorage])),
			data = Object.assign({}, raw[tabPageServerIpStorage])
		;

		/**
		 * @type {undefined|TabPageServerIdData}
		 */
		const _tabData = data[`${activeTab.id}`];
		let url, domain;
		try {
			url = new URL(activeTab.url);
			domain = url.hostname;
		} catch (e) {
			console.error(e);
		}

		let ipMore = false;
		if (url && ipRegex({exact: true}).test(url.hostname)) {
			ipMore = url.hostname;
			domain = undefined;
		}

		const reader = (blob) => {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					resolve(reader.result);
				};
				reader.onerror = reject;
				reader.readAsDataURL(blob) ;
			})
		}

		/**
		 *
		 * @type {string|null}
		 */
		let favicon = null;
		try {
			// Stop if not valid url
			new URL(activeTab.favIconUrl);

			/**
			 * @type {Blob}
			 */
			const blob = (await (await fetch(activeTab.favIconUrl)).blob());
			favicon = await reader(blob);
		} catch (e) {
			console.error('[sendSocketData] ' + activeTab.favIconUrl, e);
		}

		tabData = {
			name: activeTab.title,
			faviconUrl: favicon,
			error: _tabData?.error ?? undefined,
			statusCode: _tabData?.statusCode,
			url: activeTab.url,
			domain,
			ip: _tabData?.ip,
			ipMore,
			openGraph: _tabData?.tabOpenGraphData ?? undefined,
			pageRating: _tabData?.pageRating ?? undefined,
		}
	}

	socket.emit('updateSocketData', {
		notificationSupport: values.notification_support === true,
		userAgent: navigator.userAgent,
		browserName: await getBrowserName(),
		extensionId: chrome.runtime.id,
		tabData,
	});
}





async function clearNotification(id) {
	console.info('clear notification : ' + id)
	await chrome.notifications.clear('chromeNative-' + id)
}
async function handleSendNotification(id, opts) {
	if (opts.timeoutType) delete opts.timeoutType;
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
	const _id = notificationId.replace('chromeNative-', ''),
		cb = notificationCbMap.get(_id)
	;
	if (cb) {
		cb({
			response: 'close',
			byUser
		});
	}
});
chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', ''),
		cb = notificationCbMap.get(_id)
	;
	if (cb) {
		cb({
			response: 'action',
			index: buttonIndex
		});
	}
});
chrome.notifications.onClicked.addListener(async function (notificationId) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', ''),
		cb = notificationCbMap.get(_id)
	;
	if (cb) {
		cb({
			response: 'click'
		});
	}
});





const timeout = 5000;

export async function ping() {
	try {
		const {result} = await socket.timeout(timeout).emitWithAck('ping');
		console.info('[NativeMessaging] ping :', result);
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
	const {result} = await socket.timeout(timeout).emitWithAck('getPreference', id);
	return result.value;
}

/**
 *
 * @param {string[]} ids
 * @return {Promise<Map<string, undefined|*>>}
 */
export async function getPreferences(ids) {
	const {result} = await socket.timeout(timeout).emitWithAck('getPreferences', ids),
		output = new Map()
	;
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
 * @return {Promise<*[]>}
 */
export async function getDefaultValues() {
	const {result} = await socket.timeout(timeout).emitWithAck('getDefaultValues');
	return result;
}
self.getDefaultValues = getDefaultValues;

/**
 *
 * @param {string} sectionName
 * @return {Promise<*>}
 */
export async function showSection(sectionName) {
	const {result} = await socket.timeout(timeout).emitWithAck('showSection', sectionName);
	return result;
}



/**
 * @typedef {object} IUserscriptJson
 * @property {string} name
 * @property {string} fileName
 * @property {string} ext
 * @property {string} content
 * @property {string[]} [domains]
 * @property {string[]} tags
 * @property {string[]} [matches]
 * @property {string[]} [excludeMatches]
 * @property {Dict<string | boolean>} meta
 */
/**
 *
 * @return {Promise<IUserscriptJson[] | void>}
 */
export async function getUserscripts() {
	const {result} = await socket.timeout(timeout).emitWithAck('getUserscripts');
	return result;
}

/**
 *
 * @param {string} fileName
 * @returns {Promise<Dict<any>>}
 */
export async function getUserscriptData(fileName) {
	const {result} = await socket.timeout(timeout).emitWithAck('getUserscriptData', fileName);
	return result;
}
/**
 *
 * @param {string} fileName
 * @param {Dict<any>} newData
 * @returns {Promise<boolean>}
 */
export async function setUserscriptData(fileName, newData) {
	const {result} = await socket.timeout(timeout).emitWithAck('setUserscriptData', fileName, newData);
	return result;
}

socket.on('userScriptDataUpdated', async function (fileName, newData) {
	console.debug('[NativeMessaging] userScriptDataUpdated', fileName, newData);
	for (const cb of (await contentScripts).onUserScriptDataUpdatedCbList) {
		try {
			cb(fileName, newData);
		} catch (e) {
			console.error(e);
		}
	}
});



/**
 *
 * @param {string} browserName
 * @param {string} url
 * @return {Promise<void>}
 */
export async function openUrl(browserName, url) {
	const {result} = await socket.timeout(timeout).emitWithAck('openUrl', browserName, url);
	console.dir(result)
	return result;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		return;
	}

	if (message.id === 'ztoolbox_nativeOpenUrl') {
		const {data} = message;

		openUrl(data.browserName, data.url)
			.then(response => {
				sendResponse({
					response: response?.response ?? false,
					isError: false
				});
			})
			.catch(e => {
				console.error(e);
				sendResponse({
					response: e,
					isError: true
				});
			})
		;
		return true;
	} else if (message.id === 'showSection') {
		showSection(...message.data)
			.then(() => {
				sendResponse({
					isError: false
				});
			})
			.catch(err => {
				console.error(err);
				sendResponse({
					isError: true
				});
			})
		;
		return true;
	}
});
