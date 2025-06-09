import {
	_tabStylesStoreKey,
	_userScriptsStateStoreKey,
	_userScriptsStoreKey,
	_userStylesStateStoreKey,
	_userStylesStoreKey
} from "../constants.js";
import {appendTo} from "../utils/appendTo.js";
import {nunjuckRender} from "../init-templates.js";
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
			menus: {},
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
	let menus = [];
	try {
		const tabData = result[_tabStylesStoreKey][tab.id.toString(36)];
		matchedStyles = tabData.matchedStyles;
		menus = tabData.menus;
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

			if (Array.isArray(userScript.match)) {
				for (let match of userScript.match) {
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
			return matched;
		}),
		menus,
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
		appendTo($tabUserStyles, await nunjuckRender("panel/tabUserStyles", {
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
		let menuCommands = []
		/**
		 *
		 * @type {boolean|undefined}
		 */
		let isScriptExecuted = undefined,
			manual = undefined,
			icon = undefined
		;
		if ('script' in userStyle) {
			menuCommands = Array.from(Object.values(tabData.menus));
			isScriptExecuted = tabData.executedScripts.has(userStyle.fileName);
			manual = userStyle.manual;
			icon = userStyle.icon;
		}
		renderData.items.push({
			title: userStyle.name,
			data: {
				id: `${i}-${userStyle.fileName}`,
				label: userStyle.name,
				enabled: userStyle.enabled,
				manual,
				icon,
				fileName: userStyle.fileName,
				tags: userStyle.tags,
				menuCommands,
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

	appendTo($tabUserStyles, await nunjuckRender("panel/tabUserStyles", renderData));
}

document.addEventListener('click', function (ev) {
	const element = ev.target.closest('[data-userscript-menu-command]');
	if (!element) return;

	ev.preventDefault();
	ev.stopImmediatePropagation();

	const target = element.dataset.target,
		eventName = element.dataset.userscriptMenuCommand;
	if (!target || !eventName) return;

	console.log(eventName, target, element.dataset.userscriptAutoClose !== undefined);
	userScriptSendEvent(eventName, target)
		.catch(console.error)
		.finally(() => {
			if (element.dataset.userscriptAutoClose !== undefined) {
				window.close();
			}
		});
});

document.addEventListener('click', async function (ev) {
	const element = ev.target.closest('.userscript[data-manual-target]');
	if (!element) return;

	chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'userscript_manual_execute',
		data: {
			target: element.dataset.manualTarget,
			tabId: (await getCurrentTab()).id,
		}
	}, function () {
		console.log('[UserScript]', ...arguments);
		window.close();
	});
});

/**
 *
 * @param {string} eventName
 * @param {string} target
 * @param {chrome.tabs.Tab} [tab]
 */
async function userScriptSendEvent(eventName, target, tab) {
	if (!tab) tab = await getCurrentTab();
	console.info('Sending to tab ', tab, 'the event', eventName, 'for ', target);

	await chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'user_script_panel_event',
		data: {
			target: target,
			tabId: tab.id,
			eventName: `menuCommand-${eventName}`,
		}
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
});
