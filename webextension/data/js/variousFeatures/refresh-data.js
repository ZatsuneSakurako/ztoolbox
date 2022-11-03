'use strict';

import {ZDK} from "../classes/ZDK.js";
import {getPreference} from "../classes/chrome-preferences-2.js";
import {i18ex} from "../translation-api.js";
import {WebsiteData} from "./website-data.js";
import deviantArt from '../platforms/deviantart.js';
import freshRss from '../platforms/freshrss.js';
import {doNotif} from "../doNotif.js";

export const ALARM_NAME = 'REFRESH_DATA',
	refreshDataStorageBase = `_websitesDataStore`
;



async function doNotifyWebsite(website, websiteAPI) {
	let websiteData = websitesData.get(website),
		foldersList = ''
	;

	const labelArray = [];
	if (websiteData.logged && websiteData.hasOwnProperty('folders')) {
		for (let [name, folderData] of websiteData.folders) {
			let count = folderData.folderCount;
			if (typeof count === "number" && !isNaN(count) && count > 0) {
				let suffix = '';
				if (websiteData.notificationState.count !== null && websiteData.count > websiteData.notificationState.count) {
					suffix = ` (+${websiteData.count - websiteData.notificationState.count})`;
				}
				labelArray.push(`${name}: ${count}${suffix}`);
			}
		}
		foldersList += labelArray.join("\n");
	}

	if (!websiteData.logged) {
		const oldLoggedState = websiteData.notificationState.logged;
		if (oldLoggedState === true || oldLoggedState === undefined) {
			doNotif({
				"id": "refreshData-"+website,
				'title': i18ex._('website_notif', {'website': website}),
				'message': i18ex._('website_not_logged', {'website': website}),
				'iconUrl': websiteData.websiteIcon
			})
				.then(() => {
					ZDK.openTabIfNotExist(websiteAPI.getLoginURL(websiteData))
						.catch(console.error)
					;
				})
				.catch(console.error)
			;
		}
		websiteData.notificationState.logged = websiteData.logged;
	} else if (typeof websiteData.count === 'number' && !isNaN(websiteData.count) && (websiteData.notificationState.count === null || websiteData.count > websiteData.notificationState.count)) {
		if (await getPreference('notify_checkedData')) {
			doNotif({
				"id": "refreshData-"+website,
				"title": i18ex._('website_notif', {'website': website}),
				"message": i18ex._('count_new_notif', {'count': websiteData.count}) + "\n" + foldersList,
				"iconUrl": websiteData.websiteIcon
			})
				.then(() => {
					ZDK.openTabIfNotExist(websiteAPI.getViewURL(websiteData))
						.catch(console.error)
					;
				})
				.catch(console.error)
			;
		}

		if (await getPreference('notify_vocal')) {
			import('../voiceAPI.js')
				.then(({voiceReadMessage}) => {
					voiceReadMessage(i18ex._('language'), i18ex._('count_new_notif', {'count': websiteData.count}));
				})
				.catch(console.error)
			;
		}

	} else if (await getPreference('notify_all_viewed') && (typeof websiteData.count === 'number' && websiteData.count === 0) && (typeof websiteData.notificationState.count === 'number' && websiteData.notificationState.count > 0)) {
		doNotif({
			"id": "refreshData-"+website,
			"title": i18ex._('website_notif', {'website': website}),
			"message": i18ex._('all_viewed'),
			"iconUrl": websiteData.websiteIcon
		})
			.then(() => {
				ZDK.openTabIfNotExist(websiteAPI.getViewURL(websiteData))
					.catch(console.error)
				;
			})
			.catch(console.warn)
		;
	}

	websiteData.notificationState.count = websiteData.count;
}


const isBackgroundProcess = !location.pathname.endsWith('panel.html'),
	dataStorageArea = browser.storage.session ?? browser.storage.local
;
/**
 *
 * @type {Map<string, WebsiteData>}
 */
let websitesData = new Map();
export async function loadStoredWebsitesData() {
	if (websitesData.size === 0) {
		let raw = (await dataStorageArea.get([refreshDataStorageBase])) ?? {};
		raw = raw[refreshDataStorageBase] ?? {};

		const deviantArtData = !!raw.deviantArt ? WebsiteData.fromJSON(raw.deviantArt) : new WebsiteData();
		websitesData.set('deviantArt', deviantArtData);
		if (!deviantArtData.websiteIcon) {
			deviantArtData.websiteIcon = deviantArt.defaultFavicon;
		}
		if (!deviantArtData.href) {
			deviantArtData.href = deviantArt.getLoginURL();
		}

		const freshRss_baseUrl = await getPreference('freshRss_baseUrl');
		if (!!freshRss_baseUrl) {
			const freshRssData = !!raw.freshRss ? WebsiteData.fromJSON(raw.freshRss) : new WebsiteData();
			websitesData.set('freshRss', freshRssData);
			if (!freshRssData.websiteIcon) {
				freshRssData.websiteIcon = freshRss.defaultFavicon;
			}
			if (!freshRssData.href) {
				freshRssData.href = freshRss_baseUrl;
			}
		} else if (!!raw.freshRss) { // If no value in 'freshRss_baseUrl' but raw.freshRss data present
			delete raw.freshRss;
		}
	}
	return websitesData;
}



let isRefreshingData = false;
export async function refreshWebsitesData() {
	if (isRefreshingData === true) {
		console.warn('Already refreshing...');
		return false;
	}

	isRefreshingData = true;
	const dateStart = new Date();


	if (websitesData.size === 0) {
		websitesData = await loadStoredWebsitesData();
	}


	const websites = new Map();
	websites.set('deviantArt', deviantArt);
	if (!!await getPreference('freshRss_baseUrl')) {
		websites.set('freshRss', freshRss);
	} else if (websitesData.has('freshRss')) {
		websitesData.delete('freshRss');
	}



	console.debug('Refreshing websites data...');
	const promises = [];
	const {_notificationGloballyDisabled} = await dataStorageArea.get(['_notificationGloballyDisabled'])
	for (let [website, websiteAPI] of websites) {
		const promise = refreshWebsite(website, websiteAPI);
		promises.push(promise);
		promise
			.then(() => {
				if (!_notificationGloballyDisabled) {
					doNotifyWebsite(website, websiteAPI)
						.catch(console.error)
					;
				}
			})
			.catch((data) => {
				console.log('refreshWebsitesData', data);
			})
		;
	}

	const data = await Promise.allSettled(promises)
		.catch(console.error)
	;

	await refreshAlarm()
		.catch(console.error)
	;

	updateCountIndicator()
		.catch(console.error)
	;

	if (await getPreference('showExperimented') === true) {
		console.groupCollapsed('Websites check end');
		console.log('timings:', {
			dateStart,
			dateEnd: new Date()
		});
		console.log('fetchResponses:', data);
		console.log('Data:', websitesData);
		console.groupEnd();
	}

	if (websitesData.size > 0) {
		const output = {};
		for (let [website, data] of websitesData) {
			output[website] = data.toJSON();
		}

		await dataStorageArea.set({
			[refreshDataStorageBase]: output
		});
	}

	isRefreshingData = false;
	return data;
}

async function refreshAlarm() {
	let oldAlarm = null;
	try {
		oldAlarm = await browser.alarms.get(ALARM_NAME);
	} catch (e) {
		console.error(e);
	}

	const delayInMinutes = await getPreference('check_delay');
	if (!oldAlarm || oldAlarm.periodInMinutes !== delayInMinutes) {
		try {
			await browser.alarms.clear(ALARM_NAME)
		} catch (e) {
			console.error(e);
		}

		if (await getPreference('check_enabled') === true) {
			await browser.alarms.create(
				ALARM_NAME,
				{
					delayInMinutes,
					periodInMinutes: delayInMinutes
				}
			);
		}
	}
}

export async function updateCountIndicator() {
	if (typeof browser.action.setBadgeText !== 'function') {
		return;
	}

	let count = null;
	for (let [, websiteData] of websitesData) {
		if (websiteData.logged && websiteData.count !== null) {
			if (count === null) {
				count = 0;
			}
			const _nb = parseInt(websiteData.count);
			count += isNaN(_nb) ? 0 : _nb;
		}
	}

	let displayedCount;
	if (count === null) {
		displayedCount = '';
	} else if (count >= 1000000) {
		displayedCount = `${parseInt(count / 1000000)}M`;
	} else if (count >= 10000) {
		displayedCount = `${parseInt(count / 1000)}k`;
	} else {
		displayedCount = count.toString();
	}

	await browser.action.setBadgeText({text: displayedCount});
	await browser.action.setBadgeBackgroundColor({color: (count !== null && count > 0) ? "#FF0000" : "#424242"});
}

browser.alarms.onAlarm.addListener(function (alarm) {
	if (!isBackgroundProcess) return;

	if (alarm.name === ALARM_NAME) {
		refreshWebsitesData()
			.catch(console.error)
		;
	}
});


async function refreshWebsite(website, websiteAPI) {
	let data = null, request = null;

	if (!websiteAPI || typeof websiteAPI.getData !== 'function') {
		throw new Error('Expected getData to be a function');
	}

	try {
		const result = await websiteAPI.getData();
		data = result.data;
		request = result.response;
	} catch (e) {
		console.error(e);
	}


	if (data !== null) {
		let websiteData = websitesData.get(website);

		websiteData.count = data.get("count");
		websiteData.logged = data.get("logged");
		websiteData.loginId = data.get("loginId");
		websiteData.websiteIcon = data.get("websiteIcon");
		if (data.has("folders")) {
			websiteData.folders = data.get("folders");
		}
		websiteData.href = websiteAPI[(websiteData.logged) ? "getViewURL" : "getLoginURL"](websiteData)
		return request;
	} else {
		console.warn(`Error retrieving page for "${website}"`);
		//let websiteData = websitesData.get(website);
		//websiteData.logged  = false;
		return request;
	}
}


if (isBackgroundProcess) {
	self.websitesData = websitesData;
}
chrome.runtime.onStartup.addListener(function () {
	if (!isBackgroundProcess) {
		return;
	}

	onStartOrInstall()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	if (!isBackgroundProcess) {
		return;
	}

	onStartOrInstall()
		.catch(console.error)
	;
});
async function onStartOrInstall() {
	if (!isBackgroundProcess) {
		return;
	}

	await i18ex.loadingPromise;
	await refreshAlarm()
		.catch(console.error)
	;
	if (await getPreference('check_enabled') === false) {
		return;
	}
	await refreshWebsitesData();
}
