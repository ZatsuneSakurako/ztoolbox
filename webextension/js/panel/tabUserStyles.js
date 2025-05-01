import {_tabStylesStoreKey, _userStylesStateStoreKey, _userStylesStoreKey} from "../constants.js";
import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";

const idTabUserStyles = 'idTabUserStyles';

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<UserStyle[]>}
 */
export async function getTabUserStyles(tab) {
	const result = await chrome.storage.session.get([
		_userStylesStoreKey,
		_tabStylesStoreKey,
		_userStylesStateStoreKey
	])
		.catch(console.error);
	if (!(_userStylesStoreKey in result) || !Array.isArray(result[_userStylesStoreKey])) return [];

	const userStyles = result[_userStylesStoreKey];

	/**
	 *
	 * @type {string[] | void}
	 */
	let injectedStyles = undefined;
	try {
		injectedStyles = result[_tabStylesStoreKey][tab.id].injectedStyles;
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

	return userStyles.filter(userStyle => {
		if (userStyleStates !== undefined && userStyle.fileName in userStyleStates) {
			userStyle.enabled = userStyleStates[userStyle.fileName];
		}
		return injectedStyles && injectedStyles.includes(userStyle.fileName);
	});
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

	/**
	 * @type {UserStyle[]}
	 */
	const tabData = await dataPromise;
	if (!tabData.length) {
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
	for (let [i, userStyle] of tabData.entries()) {
		renderData.items.push({
			title: userStyle.name,
			data: {
				id: `${i}-${userStyle.fileName}`,
				label: userStyle.name,
				enabled: userStyle.enabled,
				fileName: userStyle.fileName,
				tags: userStyle.tags,
			},
		});
	}

	renderData.items.sort((a, b) => {
		if (a.data.enabled !== b.data.enabled) return b.data.enabled ? 1 : -1;
		return a.title > b.title ? 1 : -1;
	});

	appendTo($tabUserStyles, await renderTemplate("tabUserStyles", renderData));
}


/**
 *
 * @param {string} userStyleFileName
 * @param {boolean} newState
 * @return {Promise<Dict<boolean>>}
 */
async function setUserStyleStates(userStyleFileName, newState) {
	const result = (await chrome.storage.session.get(_userStylesStateStoreKey)
		.catch(console.error)) ?? {};

	/**
	 *
	 * @type {Dict<boolean>}
	 */
	const userStyleStates = result[_userStylesStateStoreKey] ?? {};
	userStyleStates[userStyleFileName] = newState;
	await chrome.storage.session.set({
		[_userStylesStateStoreKey]: userStyleStates
	});
}

document.addEventListener('change', function (ev) {
	const element = ev.target.closest('input[type="checkbox"][name^="userStyle-"]');
	if (!element) return;

	setUserStyleStates(element.value, element.checked)
		.catch(console.error);
})
