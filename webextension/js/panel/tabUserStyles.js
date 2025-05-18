import {
	_tabStylesStoreKey,
	_userScriptsStateStoreKey,
	_userScriptsStoreKey,
	_userStylesStateStoreKey,
	_userStylesStoreKey
} from "../constants.js";
import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";
import {matchesChromePattern} from "../matchesChromePattern.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";

const idTabUserStyles = 'idTabUserStyles';

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<{ userStyles: UserStyle[], executedScripts: Set<string>, userScripts: UserScript[] }>}
 */
export async function getTabUserStyles(tab) {
	const result = await chrome.storage.session.get([
		_userStylesStoreKey,
		_tabStylesStoreKey,
		_userStylesStateStoreKey,
		_userScriptsStoreKey,
		_userScriptsStateStoreKey,
	])
		.catch(console.error);
	if (!(_userStylesStoreKey in result) || !Array.isArray(result[_userStylesStoreKey])) {
		return {
			userStyles: [],
			executedScripts: new Set(),
			userScripts: [],
		};
	}

	const userStyles = result[_userStylesStoreKey],
		userScripts = result[_userScriptsStoreKey]
	;

	/**
	 *
	 * @type {string[] | void}
	 */
	let matchedStyles = undefined;
	/**
	 *
	 * @type {Set<string> | void}
	 */
	let executedScripts = undefined;
	try {
		const tabData = result[_tabStylesStoreKey][tab.id];
		matchedStyles = tabData.matchedStyles;
		executedScripts = new Set(tabData.executedScripts ?? []);
	} catch (e) {
		console.error(e);
	}
	/**
	 *
	 * @type {Dict<boolean> | void}
	 */
	let userStyleStates = undefined;
	try {
		userStyleStates = result[_userStylesStateStoreKey];
	} catch (e) {
		console.error(e);
	}

	return {
		userStyles: userStyles.filter(userStyle => {
			if (userStyleStates !== undefined && userStyle.fileName in userStyleStates) {
				userStyle.enabled = userStyleStates[userStyle.fileName];
			}
			return matchedStyles && matchedStyles.includes(userStyle.fileName);
		}),
		executedScripts,
		userScripts: userScripts.filter(userScript => {
			let matched = false;
			if (!tab.url) return false;

			if (Array.isArray(userScript.matches)) {
				for (let match of userScript.matches) {
					if (matchesChromePattern(tab.url, match)) {
						matched = true;
						break;
					}
				}
			}
			if (matched && Array.isArray(userScript.excludeMatches)) {
				for (let match of userScript.excludeMatches) {
					if (matchesChromePattern(tab.url, match)) {
						matched = false;
						break;
					}
				}
			}
			if (!matched) return false;

			userScript.enabled = true;
			return true;
		}),
	};
}

/**
 *
 * @param {chrome.tabs.Tab} activeTab
 * @returns {Promise<void>}
 */
export async function updateData(activeTab) {
	const dataPromise = getTabUserStyles(activeTab);

	const $tabUserStyles = document.querySelector(`#${idTabUserStyles}`);
	for (let node of [...$tabUserStyles.children]) {
		node.remove();
	}

	if (!activeTab) {
		return;
	}

	const tabData = await dataPromise;
	if (!tabData.userStyles.length && tabData.userScripts.length) {
		appendTo($tabUserStyles, await renderTemplate("tabUserStyles", {
			items: [
				{
					title: activeTab.title,
					data: false,
				}
			],
		}));
	}

	const renderData = {
		items: [],
	};
	for (let [i, userStyle] of [].concat(tabData.userStyles, tabData.userScripts).entries()) {
		/**
		 *
		 * @type {boolean|undefined}
		 */
		let isScriptExecuted = undefined;
		if ('script' in userStyle) {
			isScriptExecuted = tabData.executedScripts.has(userStyle.fileName);
		}
		renderData.items.push({
			title: userStyle.name,
			data: {
				id: `${i}-${userStyle.fileName}`,
				label: userStyle.name,
				enabled: userStyle.enabled,
				fileName: userStyle.fileName,
				tags: userStyle.tags,
				menuCommands: userStyle.menuCommands ?? [],
				isScriptExecuted,
				isCss: 'css' in userStyle,
				isScript: 'script' in userStyle,
			},
		});
	}

	renderData.items.sort((a, b) => {
		if (a.data.enabled !== b.data.enabled) return b.data.enabled ? 1 : -1;
		return a.title > b.title ? 1 : -1;
	});

	appendTo($tabUserStyles, await renderTemplate("tabUserStyles", renderData));
}

document.addEventListener('click', function (ev) {
	const element = ev.target.closest('[data-userscript-menu-command]');
	if (!element) return;

	ev.preventDefault();

	const target = element.dataset.target,
		eventName = element.dataset.userscriptMenuCommand;
	if (!target || !eventName) return;

	console.log(eventName, target);
	userScriptSendEvent(eventName, target).catch(console.error);
})

/**
 *
 * @param {string} eventName
 * @param {string} target
 * @param {chrome.tabs.Tab} [tab]
 */
async function userScriptSendEvent(eventName, target, tab) {
	if (!tab) tab = await getCurrentTab();
	console.info('Sending to tab ', tab, 'the event', eventName, 'for ', target);
	await chrome.tabs.sendMessage(tab.id, {
		type: "userScriptEvent",
		target,
		eventName: `menuCommand-${eventName}`,
	});
}

/**
 *
 * @param {string} userScriptFileName
 * @param {boolean} newState
 * @return {Promise<Dict<boolean>>}
 */
async function setUserScriptStates(userScriptFileName, newState) {
	const userStateStoreKey = /\.(?:ts|js)$/.test(userScriptFileName) ? _userScriptsStateStoreKey : _userStylesStateStoreKey,
		result = (await chrome.storage.session.get(userStateStoreKey).catch(console.error)) ?? {};

	/**
	 *
	 * @type {Dict<boolean>}
	 */
	const state = result[userStateStoreKey] ?? {};
	state[userScriptFileName] = newState;

	await chrome.storage.session.set({
		[userStateStoreKey]: state
	});
}

document.addEventListener('change', function (ev) {
	const element = ev.target.closest('input[type="checkbox"][name^="userStyle-"]');
	if (!element) return;

	setUserScriptStates(element.value, element.checked)
		.catch(console.error);
})
