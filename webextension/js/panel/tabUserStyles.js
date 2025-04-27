import {_tabStylesStoreKey, _userStylesStoreKey} from "../constants.js";
import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";

const idTabUserStyles = 'idTabUserStyles';

/**
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<UserStyle[]>}
 */
export async function getTabUserStyles(tab) {
	const result = await chrome.storage.session.get(_userStylesStoreKey)
		.catch(console.error);
	if (!(_userStylesStoreKey in result) || !Array.isArray(result[_userStylesStoreKey])) return [];

	const userStyles = result[_userStylesStoreKey];

	/**
	 *
	 * @type {string[] | void}
	 */
	let injectedStyles = undefined;
	try {
		injectedStyles = (await chrome.storage.session.get([_tabStylesStoreKey]))[_tabStylesStoreKey][tab.id].injectedStyles;
	} catch (e) {
		console.error(e);
	}

	return userStyles.filter(userStyle => {
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
			title: activeTab.title,
			data: {
				id: `${i}-${userStyle.fileName}`,
				label: userStyle.name,
				enabled: userStyle.enabled,
			},
		});
	}

	appendTo($tabUserStyles, await renderTemplate("tabUserStyles", renderData));
}
