import {throttle} from "../../lib/throttle.js";

/**
 *
 * @return {Promise<chrome.tabs.Tab|undefined>}
 */
export async function getCurrentTab() {
	const win = await chrome.windows.getCurrent({
		'populate': true,
		'windowTypes': ['normal']
	});
	return win.tabs.find(tab => {
		return tab.hasOwnProperty('active') && tab.active === true;
	});
}
/**
 * @param {string} name
 */
async function triggerOnCurrentTab(name) {
	const activeTab = await getCurrentTab();
	if (!activeTab) {
		return;
	}

	const tabPort = chrome.tabs.connect(activeTab.id, {
		'name': name
	});
	const promise = new Promise((resolve, reject) => {
		tabPort.onMessage.addListener(result => {
			if (typeof result !== 'string') {
				resolve(result);
				return;
			}

			try {
				resolve(JSON.parse(result));
			} catch (e) {
				console.dir(e);
			}
		});

		tabPort.onDisconnect.addListener(reject);
	});

	return {
		tabPort,
		result: await promise
	};
}

/**
 *
 * @param callback
 */
function onTabChange(callback) {
	chrome.windows.onFocusChanged.addListener(callback);
	chrome.tabs.onActivated.addListener(callback);
	callback();
}



/**
 *
 * @type {chrome.runtime.Port|null}
 */
let currTabPort = null;
async function updateServiceWorker() {
	if (currTabPort !== null) {
		currTabPort.disconnect();
		currTabPort = null;
	}

	const triggerResult = await triggerOnCurrentTab('ztoolbox_service-worker')
		.catch(console.error)
	;

	currTabPort.disconnect();
	currTabPort = null;

	if (!triggerResult) {
		return;
	}

	console.dir(triggerResult)
}

const _onTabChange = throttle(() => {
	updateServiceWorker()
		.catch(err => {
			console.error(err);
		})
	;
}, 100);
onTabChange(_onTabChange);
