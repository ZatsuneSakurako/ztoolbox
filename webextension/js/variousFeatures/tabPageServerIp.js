import {loadPageDatas} from "./loadPageDatas.js";
import {updateBadge} from './httpStatus.js';
import {webRequestFilter} from "../constants.js";

export const tabPageServerIpStorage = '_tabPageServerIp';

chrome.webRequest.onCompleted.addListener(function (details) {
	if (!details.url || !details.ip || details.tabId < 0) {
		return;
	}

	(async () => {
		let tabOpenGraphData = await loadPageDatas(details.tabId)
			.catch(console.error)
		;
		if (!tabOpenGraphData || !Array.isArray(tabOpenGraphData) || !tabOpenGraphData.at(0)) {
			tabOpenGraphData = null
		}
		const pageData = tabOpenGraphData ? tabOpenGraphData.at(0)?.result : undefined;
		updateData({
			[`${details.tabId}`]: {
				url: details.url,
				ip: details.ip,
				statusCode: details.statusCode,
				tabOpenGraphData: pageData?.openGraphData,
				pageRating: pageData?.rating,
			}
		})
			.catch(console.error)
		;
	})()
		.catch(console.error)
	;
}, webRequestFilter);

chrome.webRequest.onErrorOccurred.addListener(function (details) {
	if (!details.url || details.tabId < 0) {
		return;
	}

	updateData({
		[`${details.tabId}`]: {
			url: details.url,
			error: details.error,
			statusCode: null,
			requestId: '',
		}
	})
		.catch(console.error)
	;

}, webRequestFilter);

chrome.webRequest.onSendHeaders.addListener(function (details) {
	updateData({
		[`${details.tabId}`]: {
			url: details.url,
			ip: '',
			statusCode: null,
			requestId: '',
		}
	})
		.catch(console.error)
	;
}, webRequestFilter);

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (!('status' in changeInfo)) {
		return;
	}

	/**
	 *
	 * @type {URL|null}
	 */
	let url = null;
	try {
		url = !!tab.url && new URL(tab.url);
	} catch (e) {}

	switch (changeInfo.status) {
		case 'loading':
			if (url && !/^https?:$/i.test(url.protocol)) {
				updateData({
					[`${tabId}`]: {
						url: tab.url,
						ip: ''
					}
				})
					.catch(console.error)
				;
			}
			break;
		case 'complete':
			updateBadge(tabId)
				.catch(console.error)
			;
			break;
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
export async function updateData(newData={}) {
	const raw = (await chrome.storage.session.get([tabPageServerIpStorage])),
		data = Object.assign({}, raw[tabPageServerIpStorage], newData)
	;

	const tabs = new Set((await chrome.tabs.query({
		windowType: "normal"
	}))
		.map(tab => `${tab.id}`))
	;

	for (let [tabId, ] of Object.entries(data)) {
		if (!tabs.has(tabId)) {
			delete data[tabId];
		}
	}

	await chrome.storage.session.set({
		[tabPageServerIpStorage]: data
	})
		.catch(console.error)
	;

	return data;
}

async function init() {
	await updateData()
		.catch(console.error)
	;

	if (!!chrome.storage.session) {
		const data = await chrome.storage.local.get([tabPageServerIpStorage]);
		if (data[tabPageServerIpStorage]) {
			await chrome.storage.local.remove([tabPageServerIpStorage]);
		}
	}
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
chrome.windows.onRemoved.addListener(function (info, changeInfo, tab) {
	init()
		.catch(console.error)
	;
});

// noinspection JSUnusedLocalSymbols
chrome.tabs.onRemoved.addListener(function (info, changeInfo, tab) {
	init()
		.catch(console.error)
	;
});
init()
	.catch(console.error)
;
