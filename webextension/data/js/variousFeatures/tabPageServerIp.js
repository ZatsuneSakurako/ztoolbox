export const tabPageServerIpStorage = '_tabPageServerIp';

chrome.webRequest.onCompleted.addListener(function (details) {
	if (!details.url || !details.ip || details.tabId < 0) {
		return;
	}

	updateData({
		[details.tabId]: {
			url: details.url,
			ip: details.ip
		}
	})
		.catch(console.error)
	;

}, {'urls' : [], 'types' : ['main_frame']});

chrome.webRequest.onBeforeRequest.addListener(function (details) {
	updateData({
		[details.tabId]: {
			url: details.url,
			ip: ''
		}
	})
		.catch(console.error)
	;
}, {'urls' : [], 'types' : ['main_frame']});

browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	const url = !!tab.url && new URL(tab.url);
	if (url && 'status' in changeInfo && changeInfo.status === 'loading' && !/^https?:$/i.test(url.protocol)) {
		updateData({
			[tabId]: {
				url: tab.url,
				ip: ''
			}
		})
			.catch(console.error)
		;
	}
});


/**
 * @typedef {object} TabPageServerIdData
 * @property {string} url
 * @property {string} ip
 */
/**
 *
 * @param {Dict<TabPageServerIdData>} [newData]
 * @return {Promise<Dict<TabPageServerIdData>>}
 */
async function updateData(newData={}) {
	const raw = (await browser.storage.local.get([tabPageServerIpStorage])),
		data = Object.assign({}, raw[tabPageServerIpStorage], newData)
	;

	const tabs = new Set((await browser.tabs.query({
			windowType: "normal"
		}))
			.map(tab => `${tab.id}`))
	;

	for (let [tabId, ] of Object.entries(data)) {
		if (!tabs.has(tabId)) {
			delete data[tabId];
		}
	}

	await browser.storage.local.set({
		[tabPageServerIpStorage]: data
	});

	return data;
}

async function init() {
	updateData()
		.catch(console.error)
	;
}



chrome.runtime.onStartup.addListener(function () {
	init()
		.catch(console.error)
	;
});

chrome.runtime.onInstalled.addListener(function () {
	init()
		.catch(console.error)
	;
});

// noinspection JSUnusedLocalSymbols
browser.windows.onRemoved.addListener(function (info, changeInfo, tab) {
	init()
		.catch(console.error)
	;
});

// noinspection JSUnusedLocalSymbols
browser.tabs.onRemoved.addListener(function (info, changeInfo, tab) {
	init()
		.catch(console.error)
	;
});
init()
	.catch(console.error)
;
