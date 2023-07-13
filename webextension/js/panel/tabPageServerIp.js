import {renderTemplate} from "../init-templates.js";
import {getPreference} from "../classes/chrome-preferences.js";
import {appendTo} from "../utils/appendTo.js";

const idTabPageServerIp = 'tabPageServerIp',
	tabPageServerIpStorage = '_tabPageServerIp'
;

/**
 *
 * @return {Promise<chrome.tabs.Tab|undefined>}
 */
async function getCurrentTab() {
	const win = await chrome.windows.getCurrent({
		'populate': true,
		'windowTypes': ['normal']
	});
	return win.tabs.find(tab => {
		return tab.hasOwnProperty('active') && tab.active === true;
	});
}

export async function updateData() {
	const $tabPageServerIp = document.querySelector(`#${idTabPageServerIp}`),
		storageArea = chrome.storage.session ?? chrome.storage.local,
		raw = (await storageArea.get([tabPageServerIpStorage])),
		data = Object.assign({}, raw[tabPageServerIpStorage])
	;

	for (let node of [...$tabPageServerIp.children]) {
		node.remove();
	}

	const activeTab = await getCurrentTab();
	if (!activeTab) {
		return;
	}

	/**
	 * @type {undefined|TabPageServerIdData}
	 */
	const tabData = data[`${activeTab.id}`];
	let renderData = {
		tabName: activeTab.title,
		favIconUrl: activeTab.favIconUrl,
	};
	if (tabData) {
		const tabPageServerIp_alias = await getPreference('tabPageServerIp_alias');

		let ipMore = false;
		if (tabData.ip in tabPageServerIp_alias) {
			ipMore = tabPageServerIp_alias[tabData.ip];
		}

		renderData = {
			...renderData,
			...tabData,
			ipMore,
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
		node.classList.add('icon','material-icons')
		node.textContent = 'tab';
		node.dataset.oldSrc = target.src;
		target.replaceWith(node);
	}
}, true);