import {
	_tabStylesStoreKey,
	_userScriptsStateStoreKey,
	_userScriptsStoreKey,
	_userStylesStateStoreKey,
	_userStylesStoreKey
} from "../constants.js";
import {appendTo, replaceWith} from "../utils/appendTo.js";
import {nunjuckRender} from "../init-templates.js";
import {matchesChromePattern} from "../matchesChromePattern.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";
import {port} from "./panel-init.js";
import * as tabMover from "./tabMover.js";
import {tabMoverItemId} from "./tabMover.js";

const idTabUserStyles = 'idTabUserStyles';

/**
 * @typedef {object} getTabUserStylesResult
 * @property {UserStyle[]} userStyles
 * @property {Set<string>} executedScripts
 * @property {UserScript[]} userScripts
 */
/**
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<getTabUserStylesResult>}
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
	let menus = {};
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
	}	/**
	 *
	 * @type {Dict<boolean> | void}
	 */
	let userScriptStates = undefined;
	try {
		userScriptStates = result[_userScriptsStateStoreKey];
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

			if (userScriptStates !== undefined && userScript.fileName in userScriptStates) {
				userScript.enabled = userScriptStates[userScript.fileName];
			}

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
 * @type {chrome.tabs.Tab|null}
 */
let currentTab = null;

/**
 *
 * @param {UserStyle|UserScript} userStyle
 * @param {getTabUserStylesResult} tabData
 */
function userScriptToRenderData(userStyle, tabData) {
	let menuCommands = []
	/**
	 *
	 * @type {boolean|undefined}
	 */
	let isScriptExecuted = undefined,
		icon = undefined
	;
	if ('script' in userStyle) {
		menuCommands = Array.from(Object.values(tabData.menus))
			.sort((a, b) => {
				if (a.order === b.order) return 0;
				return a.order > b.order ? 1 : -1;
			});
		isScriptExecuted = tabData.executedScripts.has(userStyle.fileName);
		icon = userStyle.icon;
	}
	return {
		title: userStyle.name,
		data: {
			id: userStyle.fileName, // shouldn't find 2 identical file names
			enabled: userStyle.enabled,
			runAt: userStyle.runAt,
			icon,
			fileName: userStyle.fileName,
			tags: userStyle.tags,
			menuCommands,
			isScriptExecuted,
			isCss: 'css' in userStyle,
			isScript: 'script' in userStyle,
		},
	};
}

/**
 *
 * @param {chrome.tabs.Tab} activeTab
 * @returns {Promise<void>}
 */
export async function updateData(activeTab) {
	currentTab = activeTab;
	const dataPromise = getTabUserStyles(activeTab);

	const $tabUserStyles = document.querySelector(`#${idTabUserStyles}`);
	for (let node of [...$tabUserStyles.children]) {
		node.remove();
	}

	if (!activeTab) {
		return;
	}

	const tabData = await dataPromise;
	if (!tabData.userStyles.length && !tabData.userScripts.length) {
		appendTo($tabUserStyles, await nunjuckRender("tabUserStyles", {
			items: [
				{
					title: activeTab.title,
					data: false,
				},
				await tabMover.update()
			],
		}));
		return;
	}

	/**
	 *
	 * @type {(UserStyle|UserScript)[]}
	 */
	const tabDataList = [].concat(tabData.userStyles, tabData.userScripts)
		.sort((a, b) => {
			if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
			return a.index - b.index;
		});

	const renderData = {
		items: [],
	};

	renderData.items.push(await tabMover.update());

	for (let userStyle of tabDataList.values()) {
		const isEnabledScript = 'script' in userStyle && userStyle.enabled;

		if (isEnabledScript && (userStyle.runAt !== 'panel' || tabData.executedScripts.has(userStyle.fileName))) {
			chrome.runtime.sendMessage(chrome.runtime.id, {
				id: 'user_script_panel_event',
				data: {
					target: userStyle.fileName,
					tabId: activeTab.id,
					eventName: `panelOpened`,
					eventData: {},
				}
			}).catch(console.error);
		} else if (isEnabledScript && userStyle.runAt === 'panel') { // Then panel not yet executed
			await chrome.runtime.sendMessage(chrome.runtime.id, {
				id: 'userscript_manual_execute',
				data: {
					target: userStyle.fileName,
					tabId: activeTab.id,
				}
			})
				.then(result => {
					console.log('[UserScript] ' + userStyle.fileName, result);
				})
				.catch(console.error);
		}
		renderData.items.push(userScriptToRenderData(userStyle, tabData));
	}

	appendTo($tabUserStyles, await nunjuckRender("tabUserStyles", renderData));
}

/**
 *
 * @param {(function(any[]): void)} func
 * @param {number} wait
 * @return {(function(any[][]): void)}
 */
function debounceWithArgumentPreserving(func, wait) {
	let timeout, argsCalled = [];
	return function(...args) {
		clearTimeout(timeout);
		argsCalled.push(args);
		timeout = setTimeout(() => {
			const newArgs = argsCalled.splice(0, argsCalled.length);
			func.apply(this, newArgs);
		}, wait);
	};
}

const onUserScriptUpdate = debounceWithArgumentPreserving(async function onUserScriptUpdate(...args) {
	const tabData = await getTabUserStyles(currentTab),
		userScriptIds = new Set();
	for (let [userScriptId] of args) {
		userScriptIds.add(userScriptId);
		tabData.executedScripts.add(userScriptId);
	}

	for (let userScriptId of userScriptIds) {
		const targetUserScript = tabData.userScripts.find(userscript => {
			return userscript.fileName === userScriptId
		});

		if (!targetUserScript) {
			throw new Error(`[UserScript] ${userScriptId} not found`);
		}

		const $target = document.querySelector(`[id=${JSON.stringify(`userscript-${targetUserScript.fileName}`)}]`);
		replaceWith($target, await nunjuckRender("tabUserStyles", {
			items: [
				userScriptToRenderData(targetUserScript, tabData),
			]
		}));
	}
}, 100);

port.onMessage.addListener(async function onMessage(message) {
	if (!message || typeof message !== 'object') throw new Error('MESSAGE_SHOULD_BE_AN_OBJECT');

	if (message.id !== 'main_has_userScriptUpdate') return;

	const {data} = message;
	if (!currentTab || data.tabId !== currentTab.id) return;

	console.log(`[UserScript] Updating ${data.userScriptId} with reason : ${data.reason}`);
	onUserScriptUpdate(data.userScriptId);
});

document.addEventListener('click', function (ev) {
	const element = ev.target.closest('[data-userscript-menu-command]');
	if (!element) return;

	ev.preventDefault();
	ev.stopImmediatePropagation();

	const target = element.dataset.target,
		eventName = element.dataset.userscriptMenuCommand;
	if (!target || !eventName) return;

	if (target === tabMoverItemId) {
		tabMover.tabMover_mvTab(eventName.replace(/^tabMover-/, ''))
			.catch(console.error)
			.finally(() => {
				if (element.dataset.userscriptAutoClose !== undefined) {
					window.close();
				}
			});
		return;
	}

	console.log(eventName, target, element.dataset.userscriptAutoClose !== undefined);
	userScriptSendEvent(eventName, target, {
		shiftKey: ev.shiftKey,
		altKey: ev.altKey,
		ctrlKey: ev.ctrlKey,
	})
		.catch(console.error)
		.finally(() => {
			if (element.dataset.userscriptAutoClose !== undefined) {
				window.close();
			}
		});
});

document.addEventListener('click', async function (ev) {
	const element = ev.target.closest('.userscript.cursor[data-manual-target]');
	if (!element) return;

	const result = await chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'userscript_manual_execute',
		data: {
			target: element.dataset.manualTarget,
			tabId: (await getCurrentTab()).id,
		}
	}).catch(console.error);
	console.log('[UserScript]', result);
});

/**
 *
 * @param {string} eventName
 * @param {string} target
 * @param { {shiftKey: boolean, altKey: boolean, ctrlKey: boolean } } eventData
 * @param {chrome.tabs.Tab} [tab]
 */
async function userScriptSendEvent(eventName, target, eventData, tab) {
	if (!tab) tab = await getCurrentTab();
	console.info('Sending to tab ', tab, 'the event', eventName, 'for ', target);

	await chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'user_script_panel_event',
		data: {
			target: target,
			tabId: tab.id,
			eventName: `menuCommand-${eventName}`,
			eventData,
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
