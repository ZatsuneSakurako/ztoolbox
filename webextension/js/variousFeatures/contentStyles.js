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
 * @typedef {object} UserStyleTabData
 * @property {string[]} matchedStyles
 * @property {string[]} injectedStyles
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
	 * @param {chrome.storage.StorageChange} changes
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
	 * @param {string} pattern
	 * @returns {RegExp}
	 */
	static patternToRegExp(pattern) {
		// Escape special RegExp characters except for '*'
		pattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		// Replace '*' with '.*'
		pattern = pattern.replace(/\*/g, '.*');
		// Create RegExp object
		return new RegExp('^' + pattern + '$');
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
		origin: userStyle.asUserStyle ? 'USER' : 'AUTHOR',
		target: {
			tabId: tab.id,
			allFrames: userStyle.allFrames ?? false,
		}
	};
}

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @param {chrome.tabs.TabChangeInfo|undefined} changeInfo
 * @param {boolean} forceRemove
 */
export async function onTabUrl(tab, changeInfo, forceRemove) {
	contentStyles = await contentStyles;

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
	for (let userStyle of contentStyles.userStyles) {
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
	 * @type {Set<string>}
	 */
	const neededStyles = new Set();
	const tabData = contentStyles.tabData,
		currentTabData = tabData[`${tab.id}`] ?? { injectedStyles: [], matchedStyles: [] }
	/**
	 * Clear old matched styles
	 * @type {string[]}
	 */
	currentTabData.matchedStyles = [];
	for (const matchedStyle of matchedStyles) {
		const userStyleOpts = userStyleInjectOpts(matchedStyle, tab);

		let doMatch = true;
		if (!forceRemove && doMatch && matchedStyle.url.startWith !== undefined) {
			if (!url.startsWith(matchedStyle.url.startWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.endWith !== undefined) {
			if (!url.endsWith(matchedStyle.url.endWith)) doMatch = false;
		}
		if (!forceRemove && doMatch && matchedStyle.url.regex !== undefined) {
			if (!ContentStyles.patternToRegExp(matchedStyle.url.regex).test(url)) doMatch = false;
		}

		if (doMatch && !currentTabData.injectedStyles.includes(matchedStyle.fileName)) {
			currentTabData.matchedStyles.push(matchedStyle.fileName);
		}

		let enabled = matchedStyle.enabled;
		if (matchedStyle.fileName in contentStyles.userStyleStates) {
			enabled = contentStyles.userStyleStates[matchedStyle.fileName];
		}
		if (forceRemove || !doMatch || !enabled) {
			const cssIndex = currentTabData.injectedStyles.indexOf(matchedStyle.fileName);
			if (cssIndex >= 0) {
				chrome.scripting.removeCSS(userStyleOpts)
					.catch(console.error)
				;
				delete currentTabData.injectedStyles[cssIndex];
			}
			continue;
		}

		neededStyles.add(matchedStyle.fileName);
		if (!currentTabData.injectedStyles.includes(matchedStyle.fileName)) {
			chrome.scripting.insertCSS(userStyleOpts)
				.catch(console.error);
			currentTabData.injectedStyles.push(matchedStyle.fileName);
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

			const userStyleOpts = userStyleInjectOpts(userStyle, tab);
			chrome.scripting.removeCSS(userStyleOpts)
				.catch(console.error)
			;
			delete currentTabData.injectedStyles[i];
		}
	}

	currentTabData.injectedStyles = currentTabData.injectedStyles.filter(function(value) {
		return value !== undefined;
	});
	tabData[`${tab.id}`] = currentTabData;
	contentStyles.tabData = tabData;
}
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
	if ('url' in changeInfo && changeInfo.status === 'loading') {
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
		onTabUrl(tab, undefined, forceRemove)
			.catch(console.error);
	}
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

	(await contentStyles).userStyles = newUserStyles;
}
