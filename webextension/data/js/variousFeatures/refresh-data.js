'use strict';

import { ZDK } from "../classes/ZDK.js";
import {i18ex} from '../options-api.js';

const ALARM_NAME = 'REFRESH_DATA';



function doNotifyWebsite(website) {
	let websiteAPI = websites.get(website),
		websiteData = websitesData.get(website),
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
		if (getPreference('notify_checkedData')) {
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

		if (getPreference('notify_vocal')) {
			voiceReadMessage(i18ex._('language'), i18ex._('count_new_notif', {'count': websiteData.count}));
		}

	} else if (getPreference('notify_all_viewed') && (typeof websiteData.count === 'number' && websiteData.count === 0) && (typeof websiteData.notificationState.count === 'number' && websiteData.notificationState.count > 0)) {
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


class websiteDefaultData {
	constructor() {
		return {
			notificationState: {
				count: null,
				/**
				 * Undefined to know when we're checking the first time
				 * @type {?boolean}
				 */
				logged: undefined
			},
			count: 0,
			folders: new Map(),
			websiteIcon: '',
			logged: null,
			loginId: ''
		};
	}
}


let isRefreshingData = false;
export async function refreshWebsitesData() {
	if (isRefreshingData === true) {
		console.warn('Already refreshing...');
		return false;
	}

	isRefreshingData = true;

	console.debug('Refreshing websites data...');
	let promises = new Map();

	websites.forEach((websiteAPI, website) => {
		promises.set(website, refreshWebsite(website));
		promises.get(website)
			.then(() => {
				if (!!localStorage.getItem('notificationGloballyDisabled')) {
					doNotifyWebsite(website);
				}
			})
			.catch((data) => {
				console.log('refreshWebsitesData', data);
			});
	});

	const data = await Promise.allSettled(promises);

	let oldAlarm = null;
	try {
		oldAlarm = await browser.alarms.get(ALARM_NAME);
	} catch (e) {
		console.error(e);
	}

	if (!oldAlarm || oldAlarm.periodInMinutes !== getPreference('check_delay')) {
		try {
			await browser.alarms.clear(ALARM_NAME)
		} catch (e) {
			console.error(e);
		}

		await browser.alarms.create(
			ALARM_NAME,
			{
				delayInMinutes: getPreference('check_delay')
			}
		);
	}


	let count = null;
	websitesData.forEach((websiteData, website) => {
		if (websiteData.logged && websiteData.count !== null) {
			if (count === null) {
				count = 0;
			}
			const _nb = parseInt(websiteData.count);
			count += isNaN(_nb) ? 0 : _nb;
		}
	});

	if (getPreference('showExperimented') === true) {
		console.groupCollapsed('Websites check end');
		console.log('fetchResponses:', data);
		console.log('Data:', websitesData);
		console.groupEnd();
	}

	if (typeof browser.browserAction.setBadgeText === 'function') {
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

		browser.browserAction.setBadgeText({text: displayedCount});
		browser.browserAction.setBadgeBackgroundColor({color: (count !== null && count > 0)? "#FF0000" : "#424242"});
	}

	if (typeof window.panel__UpdateData === 'function') {
		window.panel__UpdateData();
	}
	isRefreshingData = false;
	return data;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.hasOwnProperty("url")) {
		console.debug(`Receiving message from: ${sender.url} (${sender.id})`);
	}

	if (chrome.runtime.id !== sender.id) {
		console.error('Message received from unknown sender id');
	} else if (typeof message === "object" && message.hasOwnProperty("data")) {
		if (message.id === 'refreshWebsitesData') {
			refreshWebsitesData()
				.then(sendResponse)
				.catch(sendResponse)
			;
			return true;
		}
	}
});

browser.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === ALARM_NAME) {
		refreshWebsitesData()
			.catch(console.error)
		;
	}
});


async function refreshWebsite(website) {
	let data = null, request = null;

	if (typeof websites.get(website).getData !== 'function') {
		throw new Error('Expected getData to be a funtion');
	}

	try {
		const result = await websites.get(website).getData();
		data = result.data;
		request = result.response;
	} catch (e) {
		console.error(e);
	}
	console.log(website, data)


	if (data !== null) {
		let websiteData = websitesData.get(website);

		websiteData.count = data.get("count");
		websiteData.logged = data.get("logged");
		websiteData.loginId = data.get("loginId");
		websiteData.websiteIcon = data.get("websiteIcon");
		if (data.has("folders")) {
			websiteData.folders = data.get("folders");
		}
		return request;
	} else {
		console.warn(`Error retrieving page for "${website}"`);
		//let websiteData = websitesData.get(website);
		//websiteData.logged  = false;
		return request;
	}
}


let websites = new Map(),
	websitesData = new Map()
;
appGlobal["websites"] = websites;
appGlobal["websitesData"] = websitesData;
window.baseRequiredPromise.then(async function () {
	const {deviantArt} = await import('../platforms/deviantart.js');
	const {freshRss} = await import('../platforms/freshrss.js');
	websites.set('deviantArt', deviantArt);
	websites.set('freshRss', freshRss);

	websites.forEach((websiteAPI, website) => {
		websitesData.set(website, new websiteDefaultData());
	});

	refreshWebsitesData();
});
