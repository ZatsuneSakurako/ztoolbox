import {getCurrentTab} from "../utils/getCurrentTab.js";
import {io} from "../../lib/socket.io.esm.min.js";
import {isServiceWorker} from "../utils/browserDetect.js";
import {contentStyles, updateStyles} from "../variousFeatures/contentStyles.js";
import {_tabStylesStoreKey} from "../constants.js";
import {getPanelPorts} from "../panelPort.js";


/**
 *
 * @type {string|null}
 */
let chrome_native_token = null;
// noinspection JSUnusedGlobalSymbols
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

let isConnected = false;
socket.on('ws open', function (err) {
	console.log('[NativeMessaging]', 'ws open', err);

	isConnected = true;
	for (let panelPort of getPanelPorts()) {
		panelPort.postMessage({
			id: 'isConnected',
			data: isConnected,
		});
	}

	sendSocketData()
		.catch(console.error);

	getSyncAllowedPreferences()
		.catch(console.error);

	updateStyles()
		.catch(console.error);
});

export function isNativeConnected() {
	return isConnected;
}

socket.on('doRestart', function () {
	chrome.runtime.restart();
});

socket.on('disconnect', function (reason, description) {
	console.log('[NativeMessaging]', 'ws close', reason, description);

	isConnected = true;
	for (let panelPort of getPanelPorts()) {
		panelPort.postMessage({
			id: 'isConnected',
			data: isConnected,
		});
	}
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
		.catch(console.error);
});





chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area === 'session' && _tabStylesStoreKey in changes) {
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
	}).catch(console.error);
	if (!tabs || !tabs.length) {
		return;
	}
	// chrome.windows.onFocusChanged.removeListener(onFocusChanged);



	await sendSocketData()
		.catch(console.error)
	;
});
chrome.tabs.onActivated.addListener(async function onFocusChanged(_) {
	await sendSocketData()
		.catch(console.error)
	;
});

async function getBrowserName() {
	if (!!navigator?.userAgentData) {
		const searchedBrands = new Set(['vivaldi', 'firefox', 'opera', 'brave'])
		const browserBrand = navigator.userAgentData.brands
			.find(uaBrandData => searchedBrands.has(uaBrandData.brand.toLowerCase()))
		;
		if (browserBrand) {
			return `${browserBrand.brand} ${browserBrand.version ?? ''}`;
		}
	}

	/**
	 * @type {chrome.bookmarks.BookmarkTreeNode}
	 */
	const firstBookmark = (await chrome.bookmarks.getTree()).at(0);
	let browserName;
	/**
	 * Properties "speeddial" and "bookmarkbar" should only exist in Vivaldi
	 */
	// noinspection JSUnresolvedReference no types, vivaldi only
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
	let tabData = null;
	const activeTab = await getCurrentTab()
		.catch(console.error)
	;
	if (activeTab) {
		try {
			/**
			 *
			 * @type {ContentStyles}
			 * @private
			 */
			const _contentStyles = await contentStyles;
			/**
			 *
			 * @type {UserStyleTabData}
			 */
			const _tabData = _contentStyles.tabData[activeTab.id.toString(36)];
			if (_tabData && _tabData.customData && _tabData.customData.requestDetails) {
				tabData = _tabData.customData.requestDetails;
				tabData.pageRating = _tabData.customData.metaRating;
			}
		} catch (e) {
			console.error(e);
		}

		/**
		 *
		 * @type {URL|undefined}
		 */
		let url = undefined;
		/**
		 *
		 * @type {string|undefined}
		 */
		let domain = undefined;
		if (activeTab.url) {
			try {
				url = new URL(activeTab.url);
				domain = url.hostname;
			} catch (e) {
				console.error('[sendSocketData] activeTab url : ' + JSON.stringify(activeTab.url), e);
			}
		}

		let ipMore = false;
		if (url && tabData && url.hostname !== tabData.ip) {
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
		if (activeTab.favIconUrl) {
			try {
				// Stop if not valid url
				new URL(activeTab.favIconUrl);

				/**
				 * @type {Blob}
				 */
				const blob = (await (await fetch(activeTab.favIconUrl)).blob());
				favicon = await reader(blob);
			} catch (e) {
				console.error('[sendSocketData] favIconUrl : ' + JSON.stringify(activeTab.favIconUrl), e);
			}
		}

		tabData = {
			name: activeTab.title,
			faviconUrl: favicon,
			statusCode: tabData?.status,
			url: activeTab.url,
			domain,
			ip: tabData?.ip,
			ipMore,
			pageRating: tabData?.pageRating ?? undefined,
		}
	}

	socket.emit('updateSocketData', {
		userAgent: navigator.userAgent,
		browserName: await getBrowserName(),
		extensionId: chrome.runtime.id,
		tabData,
	});
}





const timeout = 5000;

async function ping() {
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
 * @param {string[]} ids
 * @return {Promise<Map<string, undefined|*>>}
 */
async function getPreferences(ids) {
	const {result} = await socket.timeout(timeout).emitWithAck('getPreferences', ids),
		output = new Map()
	;
	for (let {id, value} of result) {
		output.set(id, value);
	}
	return output;
}



/**
 *
 * @type {Map<string, any | undefined>}
 */
const syncPreferences = new Map();
async function getSyncAllowedPreferences() {
	const newPreferences = await getPreferences([]);

	syncPreferences.clear();
	for (let [id, value] of newPreferences) {
		syncPreferences.set(id, value);
	}
}
async function updateSyncAllowedPreferences(data) {
	if (!data.id) {
		return;
	}

	console.log('[NativeMessaging] onSettingUpdate', data);
	const {id, newValue} = data;
	if (newValue === undefined) {
		syncPreferences.delete(id);
	} else {
		syncPreferences.set(id, newValue);
	}

	for (let panelPort of getPanelPorts()) {
		panelPort.postMessage({
			id: 'preference_update',
			changes: {
				[id]: newValue,
			},
		});
	}
}

/**
 *
 * @param {string} id
 * @return {*}
 */
export function getPreference(id) {
	return syncPreferences.get(id);
}



/**
 * @typedef {object} IUserscriptJson
 * @property {string} name
 * @property {string} fileName
 * @property {string} ext
 * @property {string} content
 * @property {string[]} [domains]
 * @property {string[]} tags
 * @property {string[]} [match]
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
