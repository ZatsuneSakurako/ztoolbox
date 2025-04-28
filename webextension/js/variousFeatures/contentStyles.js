import {i18ex} from "../translation-api.js";
import {ContextMenusController} from "../classes/contextMenusController.js";
import {getUserscripts} from "../classes/chrome-native.js";
import {_userStylesStoreKey, _tabStylesStoreKey, _userStylesStateStoreKey} from "../constants.js";


/**
 *
 * @typedef {object} UserStyle
 * @property { {domain: string, regex?: string, startWith?: string, endWith?: string} } url
 * @property {string} name
 * @property {string} fileName
 * @property {boolean} enabled
 * @property {string[]} tags
 * @property {boolean} [allFrames]
 * @property {boolean} [asUserStyle]
 * @property {string} css
 */
/**
 *
 * @returns {Promise<UserStyle[]>}
 */
export async function getUserStyles() {
	const result = await chrome.storage.session.get(_userStylesStoreKey)
		.catch(console.error);
	if (!(_userStylesStoreKey in result)) return [];

	if (!Array.isArray(result[_userStylesStoreKey])) {
		throw new Error('userStyles must be an array');
	}
	return result[_userStylesStoreKey];
}
/**
 *
 * @param {UserStyle[]} userStyles
 * @return {Promise<void>}
 */
async function setUserStyles(userStyles) {
	if (!Array.isArray(userStyles)) throw new Error('userStyles must be an array');

	await chrome.storage.session.set({
		[_userStylesStoreKey]: userStyles,
	});
}

/**
 *
 * @return {Promise<Dict<boolean>>}
 */
async function getUserStyleStates() {
	const result = await chrome.storage.session.get(_userStylesStateStoreKey)
		.catch(console.error);
	if (!(_userStylesStateStoreKey in result)) return [];

	if (!result || typeof result !== 'object') throw new Error('userStyles must be an object');
	return result[_userStylesStateStoreKey];
}



/**
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function patternToRegExp(pattern) {
	// Escape special RegExp characters except for '*'
	pattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	// Replace '*' with '.*'
	pattern = pattern.replace(/\*/g, '.*');
	// Create RegExp object
	return new RegExp('^' + pattern + '$');
}

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @param {chrome.tabs.TabChangeInfo|undefined} changeInfo
 * @param {boolean} forceRemove
 * @param {UserStyle[]} [currentUserStyles]
 */
export async function onTabUrl(tab, changeInfo, forceRemove, currentUserStyles) {
	let url = changeInfo?.url ?? tab.url;
	let domain = null;
	try {
		/**
		 * If tab is reloaded, url will be undefined so fetching it
		 */
		domain = new URL(url).hostname;
	} catch (_) {
	}
	if (!domain) {
		console.error('Could not parse domain url');
		return;
	}


	const data = {};
	for (let userStyle of (currentUserStyles ?? await getUserStyles())) {
		const domainList = data[userStyle.url.domain] ?? [];
		domainList.push(userStyle);
		data[userStyle.url.domain] = domainList;
	}


	/**
	 *
	 * @type {Set<UserStyle>}
	 */
	const matchedStyles = new Set((data[domain] ?? []).concat(data['*'] ?? []));

	/**
	 *
	 * @type {Dict<boolean>}
	 */
	const userStyleStates = (await getUserStyleStates().catch(console.error)) ?? {};

	/**
	 *
	 * @type {Set<string>}
	 */
	const injectedStyles = new Set();
	for (let matchedStyle of matchedStyles) {
		/**
		 *
		 * @type {CSSInjection}
		 */
		const userStyleOpts = {
			css: matchedStyle.css,
			origin: matchedStyle.asUserStyle ? 'USER' : 'AUTHOR',
			target: {
				tabId: tab.id,
				allFrames: matchedStyle.allFrames ?? false,
			}
		};

		let doMatch = true;
		if (!forceRemove && doMatch && matchedStyle.url.startWith !== undefined) {
			if (!url.startsWith(matchedStyle.url.startWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.endWith !== undefined) {
			if (!url.endsWith(matchedStyle.url.endWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.regex !== undefined) {
			if (!patternToRegExp(matchedStyle.url.regex).test(url)) doMatch = false;
		}

		if (doMatch) {
			/**
			 * Allow to display "matched" and disabled UserStyles
			 */
			injectedStyles.add(matchedStyle.fileName);
		}

		let enabled = matchedStyle.enabled;
		if (matchedStyle.fileName in userStyleStates) {
			enabled = userStyleStates[matchedStyle.fileName];
		}
		if (forceRemove || !doMatch || !enabled) {
			chrome.scripting.removeCSS(userStyleOpts)
				.catch(console.error)
			;
			continue;
		}

		chrome.scripting.insertCSS(userStyleOpts)
			.catch(console.error)
		;
	}



	const raw = (await chrome.storage.session.get([_tabStylesStoreKey])),
		tabData = raw[_tabStylesStoreKey] ?? {}
	;

	tabData[`${tab.id}`] = {
		injectedStyles: injectedStyles ? Array.from(injectedStyles) : [],
	}

	await chrome.storage.session.set({
		[_tabStylesStoreKey]: tabData
	})
		.catch(console.error)
	;
}
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
	// status 'complete' handled by tabPageServerIp
	if ('url' in changeInfo || changeInfo.status === 'complete') {
		onTabUrl(tab, changeInfo, false)
			.catch(console.error)
		;
	}
});





async function restartContentMenu() {
	await chrome.contextMenus.create({
		id: 'reloadUserscripts',
		title: i18ex._("reloadUserscripts"),
		contexts: [ "action" ],
	});
}
ContextMenusController.waitInit.then(restartContentMenu);
chrome.contextMenus.onClicked.addListener(function (info) {
	if (info.menuItemId !== 'reloadUserscripts') return;

	updateStyles()
		.catch(console.error);
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
		onTabUrl(tab, undefined, forceRemove, userStyles)
			.catch(console.error);
	}
}


chrome.storage.onChanged.addListener(function (changes, areaName) {
	if (areaName !== 'session') return;

	if (_userStylesStoreKey in changes) {
		_updateStyles(changes[_userStylesStoreKey])
			.catch(console.error);
	} else if (_userStylesStateStoreKey in changes) {
		getUserStyles()
			.then(userStyles => {
				_updateStyles({
					oldValue: userStyles,
					newValue: userStyles,
				})
					.catch(console.error);
			})
			.catch(console.error)
	}
});
/**
 *
 * @param {chrome.storage.StorageChange} userStyleStorageChange
 * @returns {Promise<void>}
 * @private
 */
async function _updateStyles(userStyleStorageChange) {
	await updateTabStyles(userStyleStorageChange.oldValue, true)
		.catch(console.error);
	await updateTabStyles(userStyleStorageChange.newValue);
}


export async function updateStyles() {
	const userscripts = await getUserscripts()
	console.debug('[UserScript]', 'updateStyles', userscripts);

	/**
	 *
	 * @type {UserStyle[]}
	 */
	const newUserStyles = [];
	for (let userscript of userscripts) {
		if (userscript.ext !== 'css') continue;

		newUserStyles.push({
			url: {
				domain: userscript.meta.domain,
				startWith: userscript.meta.startWith,
				endWith: userscript.meta.endWith,
				regex: userscript.meta.regex,
			},
			name: userscript.name,
			fileName: userscript.fileName,
			enabled: !userscript.meta.disabled,
			tags: userscript.tags,
			css: userscript.content,
			allFrames: userscript.meta.allFrames,
			asUserStyle: userscript.meta.asUserStyle,
		})
	}

	await setUserStyles(newUserStyles)
		.catch(console.error);
}
