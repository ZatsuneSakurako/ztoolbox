import {renderTemplate} from "../init-templates.js";
import {getPreference} from "../classes/chrome-preferences.js";
import {appendTo} from "../utils/appendTo.js";
import ipRegex from '../../lib/ip-regex.js';
import {getCurrentTab} from "../utils/getCurrentTab.js";

const idTabPageServerIp = 'tabPageServerIp',
	tabPageServerIpStorage = '_tabPageServerIp'
;

/**
 *
 * @param {chrome.tabs.Tab} activeTab
 * @returns {Promise<void>}
 */
export async function updateData(activeTab) {
	const $tabPageServerIp = document.querySelector(`#${idTabPageServerIp}`),
		raw = (await chrome.storage.session.get([tabPageServerIpStorage])),
		data = Object.assign({}, raw[tabPageServerIpStorage])
	;

	for (let node of [...$tabPageServerIp.children]) {
		node.remove();
	}

	if (!activeTab) {
		return;
	}

	/**
	 * @type {undefined|TabPageServerIdData}
	 */
	const tabData = data[`${activeTab.id}`];
	let url, domain;
	try {
		url = new URL(activeTab.url);
		domain = url.hostname;
	} catch (e) {
		console.error(e);
	}
	let renderData = {
		tabName: activeTab.title,
		favIconUrl: activeTab.favIconUrl,
	};
	if (tabData) {
		let ipMore = false;
		if (url && ipRegex({exact: true}).test(url.hostname)) {
			ipMore = url.hostname;
			domain = undefined;
		}

		renderData = {
			...renderData,
			...tabData,
			ipMore,
			url,
			domain,
			error: tabData.error ? tabData.error : undefined,
			description: [
				ipMore ? ipMore : undefined,
				tabData.statusCode !== 200 ? tabData.statusCode : undefined
			].filter(s => !!s).join(', ')
		};
	}

	appendTo($tabPageServerIp, await renderTemplate("tabPageServerIp", renderData));
}


document.addEventListener('error', (e) => {
	const target = e.target;
	if (!target) {
		return console.debug('Received event without target!');
	}

	if (/(img|svg)/i.test(target.tagName) && !target.classList.contains('error') && target.closest(`#${idTabPageServerIp}`)) {
		const node = document.createElement('span');
		node.classList.add('icon','material-symbols-outlined');
		node.textContent = 'tab';
		node.dataset.oldSrc = target.src;
		target.replaceWith(node);
	}
}, true);