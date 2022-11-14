'use strict';

import {i18ex} from "../translation-api.js";
import {getPreference} from "../classes/chrome-preferences-2.js";
import {throttle} from "../../lib/throttle.js";
import {sendNotification} from "../classes/chrome-notification.js";



async function onStart_contextMenus() {
	await i18ex.loadingPromise;

	/**
	 *
	 * @type {string|undefined}
	 */
	const api_url = await getPreference('custom_lstu_server');
	if (!api_url || !/https?:\/\/.+/.test(api_url)) return;



	const pageMenu = [];
	if (browser.contextMenus.ContextType.hasOwnProperty('PAGE')) {
		pageMenu.push("page");
	}
	if (browser.contextMenus.ContextType.hasOwnProperty('TAB')) {
		pageMenu.push("tab");
	}
	if (pageMenu.length > 0) {
		// noinspection HttpUrlsUsage
		browser.contextMenus.create({
			id: 'shorten_fromPage',
			title: i18ex._("Shorten_this_page_URL"),
			contexts: pageMenu,
			documentUrlPatterns: ["http://*/*", "https://*/*"]
		});
	}


	// noinspection HttpUrlsUsage
	browser.contextMenus.create({
		id: 'shorten_fromLink',
		title: i18ex._("Shorten_this_link"),
		contexts: ["link"],
		targetUrlPatterns: ["http://*/*", "https://*/*"]
	});
	// noinspection HttpUrlsUsage
	browser.contextMenus.create({
		id: 'shorten_fromImage',
		title: i18ex._("Shorten_this_picture"),
		contexts: ["image"],
		targetUrlPatterns: ["http://*/*", "https://*/*"]
	});
}
export const updateLstuContextMenu = throttle(async function updateLstuContextMenu() {
	onStart_contextMenus()
		.catch(console.error)
	;
}, 5000);
self.updateLstuContextMenu = updateLstuContextMenu;



// noinspection JSUnusedLocalSymbols
chrome.contextMenus.onClicked.addListener(function (info, tab) {
	let url;
	switch (info.menuItemId) {
		case 'shorten_fromPage':
			url = info.pageUrl;
			break;
		case 'shorten_fromLink':
			url = info.linkUrl;
			break;
		case 'shorten_fromImage':
			url = info.srcUrl;
			break;
	}

	if (!url) {
		return;
	}

	console.info(`[ContextMenu] URL: ${url}`);
	shortener_url__no_api(url)
		.catch(console.error)
	;
})





/**
 *
 * @param {string|number} targetedTabId
 * @param {number} [timeout]
 * @return {Promise<object>}
 * @private
 */
function _waitTabLoad(targetedTabId, timeout=60000) {
	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			reject();
		}, timeout);
		const unloadEvent = () => {
			chrome.tabs.onUpdated.removeListener(onTabLoad);
			clearTimeout(timeoutId);
		};



		const onTabLoad = function onTabLoad(tabId, changeInfo, tab) {
			if (tabId !== targetedTabId) {
				return;
			}

			if (changeInfo.status === 'complete') {
				unloadEvent();
				resolve(tab);
			}
		};
		chrome.tabs.onUpdated.addListener(onTabLoad);
	})
}

/**
 *
 * @param {string} url
 * @return {Promise<Tab|void>}
 */
async function openAndWaitUrl(url) {
	let createdTab;
	try {
		createdTab = await browser.tabs.create({
			active: true,
			url
		});
	} catch (e) {
		console.error(e);
		return null;
	}

	try {
		await _waitTabLoad(createdTab.id, 60000);
	} catch (e) {
		console.error(e);
		return null;
	}

	return createdTab;
}

/**
 *
 * @param {string} url
 * @return {boolean}
 */
function isRightURL(url) {
	let test_url = /https?:\/\/.+/;
	return (typeof url === "string" && test_url.test(url));
}

/**
 *
 * @param {string} url
 * @return {Promise<void>}
 */
export async function shortener_url__no_api(url) {
	let api_url = await getPreference('custom_lstu_server');
	if (!api_url) {
		await sendNotification({
			message: i18ex._('Check_your_link_or_page')
		})
			.catch(console.error)
		;
		return;
	}

	if (typeof url !== "string" || isRightURL(url) !== true) {
		await sendNotification({
			message: i18ex._('Check_your_link_or_page'),
			isClickable: true
		});
		return;
	}



	let tab;
	try {
		tab = await openAndWaitUrl(api_url);
	} catch (e) {
		console.error(e);
		return;
	}



	let execResult;
	try {
		execResult = await browser.tabs.executeScript(
			tab.id,
			{
				allFrames: false,
				file: '/js/contentscripts/lstu_contentScript.js',
				runAt: 'document_start'
			}
		)
	} catch (e) {
		console.error(e);
		sendNotification({
			message: i18ex._('Error_on_request')
		})
			.catch(console.error)
		;
		return;
	}

	if (Array.isArray(execResult) !== true && execResult.length !== 1 && execResult[0] === true) {
		return;
	}



	let contentScriptResult;
	try {
		contentScriptResult = await launchShortenerContentScript(tab, {
			name: 'framalink_view_launch',
			targetUrl: url
		});
		await _waitTabLoad(tab.id, 60000);
	} catch (e) {
		console.error(e);
	}

	try {
		const url = (await browser.tabs.get(tab.id)).url;
		if (contentScriptResult.response !== url) {
			return;
		}
	} catch (e) {
		console.error(e);
	}





	try {
		execResult = await browser.tabs.executeScript(
			tab.id,
			{
				allFrames: false,
				file: '/js/contentscripts/lstu_contentScript.js',
				runAt: 'document_start'
			}
		)
	} catch (e) {
		console.error(e);
		sendNotification({
			message: i18ex._('Error_on_request')
		})
			.catch(console.error)
		;
		return;
	}

	if (Array.isArray(execResult) !== true && execResult.length !== 1 && execResult[0] === true) {
		return;
	}

	let error;
	try {
		const shortResult = await launchShortenerContentScript(tab, {
			name: 'framalink_view_copy'
		});

		error = shortResult.isError;
	} catch (e) {
		console.error(e);
		error = true;
	}

	sendNotification({
		message: error ?
			i18ex._('Error_when_copying_to_clipboard')
			:
			i18ex._('Shortened_link_copied_in_the_clipboard')
	})
		.catch(console.error)
	;
}

/**
 *
 * @param {object} tab
 * @param {object} data
 * @return {Promise<{response: unknown, isError:boolean}>}
 */
async function launchShortenerContentScript(tab, data) {
	try {
		/**
		 *
		 * @type { {response: unknown, isError:boolean}|void }
		 */
		const response = await browser.tabs.sendMessage(tab.id, data);
		if (typeof response !== 'object' || !!response.isError) {
			console.group();
			console.log('[ContentScript] Error from lstu service :');
			console.error(response.response);
			console.groupEnd();
		}

		return response;
	} catch (e) {
		console.error(e);
	}
}
