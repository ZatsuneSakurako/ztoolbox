import {getUserscripts} from "../classes/chrome-native.js";
import {_tabStylesStoreKey, _userStylesStateStoreKey, _userStylesStoreKey, webRequestFilter,} from "../constants.js";
import {contentScripts} from "./contentScripts.js";
import {updateBadge} from "./httpStatus.js";
import {errorToString} from "../utils/errorToString.js";


/**
 *
 * @typedef {object} UserStyle
 * @property { {domain: string|string[], regex?: string, startWith?: string, endWith?: string} } url
 * @property {number} index
 * @property {string} name
 * @property {string} fileName
 * @property {boolean} enabled
 * @property {string[]} tags
 * @property {boolean} [allFrames]
 * @property {'user'|'author'|'adoptedCss'} [injectAs]
 * @property {string} css
 */
/**
 *
 * @typedef {object} UserStyleTabData
 * @property {string[]} executedScripts
 * @property {string[]} matchedStyles
 * @property {string[]} injectedStyles
 * @property {string[]} injectedFromTabStyles
 * @property {Dict<RegisterMenuCommand>} menus
 * @property {Dict<any>} customData
 *
 */
class ContentStyles {
	/**
	 * @type {UserStyle[] | null}
	 */
	#userStyles= null;
	/**
	 * @type {Dict<boolean> | null}
	 */
	#userStyleStates= null;
	/**
	 * @type {Dict<UserStyleTabData> | null}
	 */
	#tabData= null;

	/**
	 * @private
	 */
	constructor() {
		chrome.storage.onChanged.addListener((changes, areaName) => {
			this.#onStorageChange(changes, areaName);
		});
	}

	// noinspection SpellCheckingInspection
	/**
	 * @type {ContentStyles}
	 */
	static #instance;
	/**
	 * @return {ContentStyles}
	 */
	static get instance() {
		return this.#instance;
	}
	/**
	 *
	 * @returns {Promise<ContentStyles>}
	 */
	static async load() {
		this.#instance = new ContentStyles();
		await this.#instance.load();
		return this.#instance;
	}
	async load() {
		if (!this.#userStyles) {
			const result = await chrome.storage.session.get(_userStylesStoreKey)
				.catch(console.error);
			if (!(_userStylesStoreKey in result)) {
				this.#userStyles = [];
			} else {
				if (!Array.isArray(result[_userStylesStoreKey])) {
					throw new Error('userStyles must be an array');
				}
				this.#userStyles = result[_userStylesStoreKey];
			}
		}

		if (!this.#userStyleStates) {
			const result = await chrome.storage.session.get(_userStylesStateStoreKey)
				.catch(console.error);
			if (!(_userStylesStateStoreKey in result)) {
				this.#userStyleStates = {};
			} else {
				if (!result || typeof result !== 'object') throw new Error('userStyles must be an object');
				this.#userStyleStates = result[_userStylesStateStoreKey];
			}

		}

		if (!this.#tabData) {
			const result = await chrome.storage.session.get(_tabStylesStoreKey)
				.catch(console.error);
			if (!(_tabStylesStoreKey in result)) {
				this.#tabData = {};
			} else {
				if (!result || typeof result !== 'object') throw new Error('tabData must be an object');
				this.#tabData = result[_tabStylesStoreKey];
			}
		}
	}



	/**
	 *
	 * @param {Dict<chrome.storage.StorageChange>} changes
	 * @param {chrome.storage.AreaName} areaName
	 */
	#onStorageChange(changes, areaName) {
		if (areaName !== 'session') return;

		if (_userStylesStoreKey in changes) {
			const oldValue = changes[_userStylesStoreKey].oldValue,
				newValue = changes[_userStylesStoreKey].newValue;

			(async () => {
				await updateTabStyles(oldValue, true)
					.catch(console.error);
				this.#userStyles = newValue;
				await updateTabStyles(newValue);
			})()
				.catch(console.error)
		} else if (_userStylesStateStoreKey in changes) {
			this.#userStyleStates = changes[_userStylesStateStoreKey].newValue;

			updateTabStyles(this.#userStyles)
				.catch(console.error);
		}
	}



	/**
	 *
	 * @param {UserStyle[]} newValue
	 */
	set userStyles(newValue)  {
		if (!Array.isArray(newValue)) throw new Error('ARRAY_VALUE_EXPECTED');
		this.#userStyles = newValue;
		chrome.storage.session.set({
			[_userStylesStoreKey]: newValue
		})
			.catch(console.error);
	}
	/**
	 *
	 * @returns {UserStyle[]}
	 */
	get userStyles()  {
		if (!this.#userStyles) {
			throw new Error('USER_STYLES_NOT_LOADED');
		}
		return this.#userStyles;
	}

	/**
	 *
	 * @param {Dict<boolean>} newValue
	 */
	set userStyleStates(newValue)  {
		this.#userStyleStates = newValue;
		chrome.storage.session.set({
			[_userStylesStateStoreKey]: newValue,
		})
			.catch(console.error);
	}
	/**
	 *
	 * @return {Dict<boolean>}
	 */
	get userStyleStates()  {
		if (!this.#userStyleStates) {
			throw new Error('USER_STYLES_STATES_NOT_LOADED');
		}
		return this.#userStyleStates;
	}

	/**
	 *
	 * @param {Dict<UserStyleTabData>} newValue
	 */
	set tabData(newValue)  {
		this.#tabData = newValue;
		chrome.storage.session.set({
			[_tabStylesStoreKey]: newValue,
		})
			.catch(console.error);
	}
	/**
	 *
	 * @return {Dict<UserStyleTabData>}
	 */
	get tabData()  {
		if (!this.#tabData) {
			throw new Error('TAB_DATA_NOT_LOADED');
		}
		return this.#tabData;
	}
	/**
	 *
	 * @returns {UserStyleTabData}
	 */
	get tabNewData() {
		return {
			injectedStyles: [],
			injectedFromTabStyles: [],
			executedScripts: [],
			matchedStyles: [],
			menus: {},
			customData: {},
		}
	}
}

/**
 *
 * @type {ContentStyles|Promise<ContentStyles>}
 */
export let contentStyles = ContentStyles.load();

/**
 *
 * @param {UserStyle} userStyle
 * @param {chrome.tabs.Tab} tab
 * @return chrome.scripting.CSSInjection
 */
function userStyleInjectOpts(userStyle, tab) {
	return {
		css: userStyle.css,
		origin: (userStyle.injectAs ?? '').toLowerCase() === 'user' ? 'USER' : 'AUTHOR',
		target: {
			tabId: tab.id,
			allFrames: userStyle.allFrames ?? false,
		}
	};
}

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @param {chrome.tabs.TabChangeInfo|chrome.webNavigation.WebNavigationParentedCallbackDetails|undefined} details
 * @param {boolean} forceRemove
 */
export async function onTabUrl(tab, details, forceRemove) {
	// Exclude iframes & special "tabs"
	if (!!details && (details.frameId !== 0 || details.tabId < 0)) return;

	contentStyles = await contentStyles;

	let url = details?.url ?? tab.url;
	let domain = null;
	try {
		/**
		 * If tab is reloaded, url will be undefined so fetching it
		 */
		domain = new URL(url).hostname;
	} catch (_) {
	}
	if (!domain) {
		console.error(`Could not parse domain url "${url}"`);
		return;
	}


	const data = {};
	for (let userStyle of contentStyles.userStyles) {
		for (const domain of Array.isArray(userStyle.url.domain) ? userStyle.url.domain : [userStyle.url.domain]) {
			const userStyleList = data[domain] ?? [];
			userStyleList.push(userStyle);
			data[domain] = userStyleList;
		}
	}

	/**
	 *
	 * @type {Set<UserStyle>}
	 */
	const matchedStyles = new Set((data[domain] ?? []).concat(data['*'] ?? []));

	/**
	 *
	 * @type {Set<string>}
	 */
	const neededStyles = new Set();
	const tabData = contentStyles.tabData,
		currentTabData = tabData[tab.id.toString(36)] ?? contentStyles.tabNewData
	tabData[tab.id.toString(36)] = currentTabData;

	/**
	 *
	 * @type { { fileName: string, css?: string }[] }
	 */
	const injectFromTab = [];

	/**
	 * Clear old matched styles
	 * @type {string[]}
	 */
	currentTabData.matchedStyles = [];
	for (const matchedStyle of matchedStyles) {
		if (matchedStyle.injectAs !== undefined && !['user', 'author', 'adoptedCss'].includes(matchedStyle.injectAs)) {
			console.error('Unsupported "injectAs" from ' + matchedStyle.fileName);
			continue;
		}
		if (matchedStyle.injectAs === 'adoptedCss' && matchedStyle.allFrames) {
			console.error('Unsupported allFrames with adoptedCss from ' + matchedStyle.fileName);
			continue;
		}
		const userStyleOpts = userStyleInjectOpts(matchedStyle, tab);

		let doMatch = true;
		if (!forceRemove && doMatch && matchedStyle.url.startWith !== undefined) {
			if (!url.startsWith(matchedStyle.url.startWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.endWith !== undefined) {
			if (!url.endsWith(matchedStyle.url.endWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.regex !== undefined) {
			if (!new RegExp(matchedStyle.url.regex).test(url)) doMatch = false;
		}

		if (doMatch && !currentTabData.matchedStyles.includes(matchedStyle.fileName)) {
			currentTabData.matchedStyles.push(matchedStyle.fileName);
		}

		let enabled = matchedStyle.enabled;
		if (matchedStyle.fileName in contentStyles.userStyleStates) {
			enabled = contentStyles.userStyleStates[matchedStyle.fileName];
		}
		if (forceRemove || !doMatch || !enabled) {
			const cssIndex = currentTabData.injectedStyles.indexOf(matchedStyle.fileName);
			if (cssIndex >= 0) {
				if (matchedStyle.injectAs === 'adoptedCss') {
					injectFromTab.push({
						fileName: matchedStyle.fileName,
						css: undefined,
					});
				} else {
					chrome.scripting.removeCSS(userStyleOpts)
						.catch(console.error);
				}
				delete currentTabData.injectedStyles[cssIndex];
			}
			continue;
		}

		neededStyles.add(matchedStyle.fileName);
		if (!currentTabData.injectedStyles.includes(matchedStyle.fileName) || currentTabData.injectedFromTabStyles.includes(matchedStyle.fileName)) {
			if (matchedStyle.injectAs === 'adoptedCss') {
				injectFromTab.push({
					fileName: matchedStyle.fileName,
					css: matchedStyle.css,
				});
			} else {
				chrome.scripting.insertCSS(userStyleOpts)
					.catch(console.error);
			}
			currentTabData.injectedStyles.push(matchedStyle.fileName);
			currentTabData.injectedFromTabStyles.push(matchedStyle.fileName);
		}
	}

	for (const [i, injectedStyle] of currentTabData.injectedStyles.entries()) {
		if (injectedStyle === undefined) continue;

		if (!neededStyles.has(injectedStyle)) {
			const userStyle = contentStyles.userStyles
				.find(userStyle => userStyle.fileName === injectedStyle);
			if (!userStyle) {
				console.error(`Cannot remove user style "${injectedStyle}" (not found)`);
				continue;
			}

			if (userStyle.injectAs === 'adoptedCss') {
				injectFromTab.push({
					fileName: userStyle.fileName,
					css: undefined,
				});
			} else {
				const userStyleOpts = userStyleInjectOpts(userStyle, tab);
				chrome.scripting.removeCSS(userStyleOpts)
						.catch(console.error)
				;
			}
			delete currentTabData.injectedStyles[i];
		}
	}


	const action = async () => {
		let result = await chrome.tabs.sendMessage(tab.id, {
			id: 'updateInjectedStyles',
			data: injectFromTab,
		});
		let isError = false;
		if (result === undefined) {
			console.warn(`[UserScript] Style from tab ${tab.id} : no reply`);
			return null;
		} else if (result && typeof result === 'object' && 'isError' in result) {
			isError = result.isError;
			result = result.response;
		}
		console[isError ? 'error' : 'log'](`[UserScript] Style from tab ${tab.id}`, result);
		return result;
	};
	const wait = (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	if (injectFromTab.length) {
		let noReply = false;
		try {
			// In case script already injected, post message directly
			let result = null;
			for (const index of [1,2,3]) { // 3 tries
				result = await action();
				if (result !== null) {
					break;
				}
				/**
				 * wait before next try
				 */
				await wait();
			}
			if (result === null) {
				noReply = true;
			}
		} catch (e) {
			if (/Could not establish connection/i.test(e.toString().toLowerCase())) {
				noReply = true;
			} else {
				console.error(e);
			}
		}
		if (noReply) {
			try {
				// Inject script and post message
				const result = await chrome.scripting.executeScript({
					files: [ '/js/variousFeatures/contentScripts/injectStyles.js' ],
					injectImmediately: true,
					target: { tabId: tab.id, allFrames: false },
				});
				const receivedResponse = result.some(item => !!item.result);
				if (receivedResponse) {
					await action();
				} else {
					console.error('[UserScript] Style from tab ' + tab.id, result);
				}
			} catch (e) {
				console.error(e);
			}
		}
	}


	currentTabData.injectedStyles = currentTabData.injectedStyles.filter(function(value) {
		return value !== undefined;
	});
	tabData[tab.id.toString(36)] = currentTabData;
	contentStyles.tabData = tabData;
}
chrome.webNavigation.onCommitted.addListener(function (details) {
	// Exclude iframes & special "tabs"
	if (details.frameId !== 0 || details.tabId < 0) return;

	(async () => {
		const tab = await chrome.tabs.get(details.tabId)
			.catch(console.error);
		if (!tab) return;
		await onTabUrl(tab, details, false)
			.catch(console.error);
	})()
		.catch(console.error);
});

async function onWebRequestEvent(details) {
	// Exclude iframes & special "tabs"
	if (details.frameId !== 0 || details.tabId < 0) return;

	await updateBadge(details.tabId, {
		statusCode: details.statusCode,
	}).catch(console.error);

	const _contentStyles = await contentStyles,
		tabDatas = _contentStyles.tabData,
		tabData = tabDatas[details.tabId.toString(36)];
	if (!tabData || !tabData.customData) return;

	const requestDetails = tabData.customData.requestDetails ?? {
		method: details.method,
		status: details.statusCode,
		timeStamp: details.timeStamp,
	};
	if (details.ip !== undefined) {
		requestDetails.ip = details.ip;
	}
	if (details.responseHeaders) {
		requestDetails.responseHeaders = details.responseHeaders.map(header => {
			return {
				name: header.name,
				value: header.value,
			};
		});
	}
	tabData.customData.requestDetails = requestDetails;
	_contentStyles.tabData = tabDatas;
}
chrome.webRequest.onHeadersReceived.addListener(onWebRequestEvent, webRequestFilter, ['responseHeaders']);
chrome.webRequest.onCompleted.addListener(onWebRequestEvent, webRequestFilter);
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status === 'complete') {
		setTimeout(async () => {
			try {
				const tabData = (await contentStyles).tabData[tabId.toString(36)];
				if (!tabData || !tabData.customData) return;

				await updateBadge(tab.id, {
					statusCode: tabData.customData.requestDetails?.status,
				});
			} catch (e) {
				console.error(e);
			}
		});
	}
});





chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!message || typeof message !== 'object' || sender.id !== chrome.runtime.id) return;

	if (message.id === 'refreshUserStyles') {
		updateStyles()
			.then(response => {
				sendResponse({ isError: false, response });
			})
			.catch(error => {
				sendResponse({ isError: true, response: errorToString(error) });
			});
	}
});

/**
 *
 * @param {UserStyle[]} userStyles
 * @param {boolean} forceRemove
 * @returns {Promise<void>}
 */
async function updateTabStyles(userStyles, forceRemove=false) {
	if (!userStyles || !userStyles.length) {
		console.warn('Empty UserStyle list');
		return;
	}

	const tabs = await chrome.tabs.query({
		windowType: 'normal'
	})
		.catch(console.error);

	for (let tab of tabs ?? []) {
		onTabUrl(tab, undefined, forceRemove)
			.catch(console.error);
	}
}


/**
 *
 * @param {string} path
 * @return {string}
 */
function normalizeSlashes(path) {
	return path.split(/[/\\]/).join('/');
}

/**
 *
 * @param {string} path
 * @return { {basename?: string, dirname: string} }
 */
function splitDirnameAndBasename(path) {
	const parts = path.split('/');
	const basename = parts.pop();
	return {
		basename,
		dirname: parts.join('/'),
	};
}

export async function updateStyles() {
	const userscripts = (await getUserscripts())
		.map(userscript => {
			// Make sure to only have / as path separator
			userscript.fileName = normalizeSlashes(userscript.fileName);
			const {dirname, basename} = splitDirnameAndBasename(userscript.fileName);
			userscript.dirname = dirname;

			const newPath = [];
			if (userscript.dirname) newPath.push(userscript.dirname);
			newPath.push(userscript.name ?? basename);

			userscript.sortName = newPath.join('/');
			return userscript;
		});

	const grouped = new Map();
	for (const userscript of userscripts) {
		const tag = userscript.tags.at(0) ?? '_none',
			groupList = grouped.get(tag) ?? [];
		groupList.push(userscript);
		grouped.set(tag, groupList);
	}
	console.debug('[UserScript]', 'updateStyles', Object.fromEntries(grouped.entries()));


	/**
	 * Items not in folder first,
	 * Then sort by fileName (this contains the path)
	 */
	userscripts.sort((a, b) => {
		const aInFolder = a.fileName.includes('/'),
			bInFolder = b.fileName.includes('/');
		if (aInFolder !== bInFolder) return aInFolder ? 1 : -1;
		return a.sortName.localeCompare(b.sortName);
	});
	/**
	 * Save current sorting position
	 */
	userscripts.forEach((userscript, index) => {
		userscript.tmpIndex = index;
		return userscript;
	});
	/**
	 * Move item that have an index in meta (meta.index starts with 0)
	 */
	userscripts.sort((a, b) => {
		const aIndex = a.meta.index !== undefined ? parseInt(a.meta.index) : a.tmpIndex,
			bIndex = b.meta.index !== undefined ? parseInt(b.meta.index) : b.tmpIndex;
		if (aIndex === bIndex && a.meta.index !== b.meta.index) {
			if (a.meta.index !== undefined) return -1;
			if (b.meta.index !== undefined) return -1;
		}
		return aIndex - bIndex;
	});
	/**
	 * Remove temporary index
	 */
	userscripts.forEach(userscript => {
		delete userscript.tmpIndex;
		return userscript;
	});


	/**
	 *
	 * @type {UserStyle[]}
	 */
	const newUserStyles = [];
	/**
	 *
	 * @type {UserScript[]}
	 */
	const newUserScripts = [];
	for (let [index, userscript] of userscripts.entries()) {
		if (userscript.ext === 'css') {
			newUserStyles.push({
				url: {
					domain: userscript.domains ?? userscript.meta.domain,
					startWith: userscript.meta.startWith,
					endWith: userscript.meta.endWith,
					regex: userscript.meta.regex,
				},
				index,
				name: userscript.name,
				fileName: userscript.fileName,
				enabled: !userscript.meta.disabled,
				tags: userscript.tags,
				css: userscript.content,
				allFrames: userscript.meta.allFrames,
				injectAs: userscript.meta.injectAs,
			});
		} else if (userscript.ext === 'js') {
			newUserScripts.push({
				grant: userscript.grant,
				match: userscript.match,
				excludeMatches: userscript.excludeMatches,
				index,
				name: userscript.name,
				fileName: userscript.fileName,
				enabled: !['manual', 'panel'].includes(userscript.meta['run-at']) && !userscript.meta.disabled,
				icon: userscript.meta.icon,
				tags: userscript.tags,
				script: userscript.content,
				allFrames: userscript.meta.allFrames,
				sandbox: userscript.meta.sandbox,
				runAt: userscript.meta['run-at'],
			});
		}
	}

	(await contentStyles).userStyles = newUserStyles;
	(await contentScripts).userScripts = newUserScripts;
}
