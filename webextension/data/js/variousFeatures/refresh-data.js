'use strict';

import {ZDK} from "../classes/ZDK.js";

const ALARM_NAME = 'REFRESH_DATA';



function doNotifyWebsite(website, websiteAPI) {
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
			import('../voiceAPI.js')
				.then(({voiceReadMessage}) => {
					voiceReadMessage(i18ex._('language'), i18ex._('count_new_notif', {'count': websiteData.count}));
				})
				.catch(console.error)
			;
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


/**
 * @type {DataStore|undefined}
 */
let websitesDataStore;
/**
 *
 * @return {Promise<DataStore>}
 */
async function getWebsiteDataStore() {
	if (!!websitesDataStore) {
		return websitesDataStore;
	}

	const {WebsiteData} = await import("./website-data.js"),
		{DataStore} = await import('../classes/data-store.js'),
		_websitesDataStore = new DataStore()
	;
	_websitesDataStore.setCompression('websiteData', function (key, id, data) {
		data = data.toJSON();

		if (data.count === 0) delete data.count;
		if (data.folders.length === 0) delete data.folders;
		if (!data.logged) delete data.logged;
		if (!data.loginId) delete data.loginId;
		if (!data.href) delete data.href;
		if (!data.websiteIcon) delete data.websiteIcon;

		if (data.notificationState) {
			for (let [name, value] of Object.entries(data.notificationState)) {
				if (!value) {
					delete data.notificationState[name]
				}
			}
			if ([...Object.values(data.notificationState)].length === 0) {
				delete data.notificationState;
			}
		}

		return data;
	}, function (key, id, data) {
		return WebsiteData.fromJSON(data);
	});
	websitesDataStore = _websitesDataStore;

	return websitesDataStore;
}
async function loadStoredWebsitesData() {
	if (websitesData.size === 0) {
		const websitesDataStore = await getWebsiteDataStore(),
			tmpWebsitesData = new Map()
		;
		websitesDataStore.forEach('websiteData', function (key, website, websiteData) {
			tmpWebsitesData.set(website, websiteData);
		});
		websitesData.set('deviantArt', tmpWebsitesData.get('deviantArt'));
		websitesData.set('freshRss', tmpWebsitesData.get('freshRss'));
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


	if (websitesData.size === 0) {
		websitesData = await loadStoredWebsitesData();
	}


	const websites = new Map();
	websites.set(
		'deviantArt',
		(await import('../platforms/deviantart.js')).default
	);
	if (!!getPreference('freshRss_baseUrl')) {
		websites.set(
			'freshRss',
			(await import('../platforms/freshrss.js')).default
		);
	} else if (websitesData.has('freshRss')) {
		websitesData.delete('freshRss');
	}



	console.debug('Refreshing websites data...');
	const promises = [];
	for (let [website, websiteAPI] of websites) {
		if (!websitesData.has(website)) {
			const {WebsiteData} = await import("./website-data.js");
			websitesData.set(website, new WebsiteData());
		}

		const promise = refreshWebsite(website, websiteAPI);
		promises.push(promise);
		promise
			.then(() => {
				if (!localStorage.getItem('notificationGloballyDisabled')) {
					doNotifyWebsite(website, websiteAPI);
				}
			})
			.catch((data) => {
				console.log('refreshWebsitesData', data);
			});
	}

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
	for (let [, websiteData] of websitesData) {
		if (websiteData.logged && websiteData.count !== null) {
			if (count === null) {
				count = 0;
			}
			const _nb = parseInt(websiteData.count);
			count += isNaN(_nb) ? 0 : _nb;
		}
	}

	if (getPreference('showExperimented') === true) {
		console.groupCollapsed('Websites check end');
		console.log('fetchResponses:', data);
		console.log('Data:', websitesData);
		console.groupEnd();
	}


	const websitesDataStore = await getWebsiteDataStore();
	for (let [website, data] of websitesData) {
		websitesDataStore.set('websiteData', website, data);
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

	isRefreshingData = false;
	return data;
}

async function sendDataToPanel() {
	await window.baseRequiredPromise;
	return await browser.runtime.sendMessage({
		id: 'mainToPanel_panelData',
		data: {
			notificationGloballyDisabled: !!localStorage.getItem('notificationGloballyDisabled'),
			websitesData: [...websitesData.entries()]
				.map(data => {
					data[1] = data[1].toJSON();
					return data;
				})
		}
	});
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.hasOwnProperty("url")) {
		console.debug(`Receiving message from: ${sender.url} (${sender.id})`);
	}

	if (chrome.runtime.id !== sender.id) {
		console.error('Message received from unknown sender id');
	} else if (typeof message === "object" && message.hasOwnProperty("data")) {
		const isFromPanel = sender.url.endsWith('/panel.html');

		switch (message.id) {
			case 'panel_onload':
				if (isFromPanel) {
					if (websitesData.size === 0) {
						loadStoredWebsitesData()
							.finally(() => {
								sendDataToPanel()
									.catch(console.error)
								;
							})
						;
					}

					sendDataToPanel()
						.catch(console.error)
					;
				}
				break;
			case 'btn_notificationGloballyDisabled':
				const oldState = localStorage.getItem('notificationGloballyDisabled') !== null;
				if (oldState) {
					localStorage.removeItem('notificationGloballyDisabled');
				} else {
					localStorage.setItem('notificationGloballyDisabled', '1');
				}

				sendDataToPanel()
					.catch(console.error)
				;
				break;
			case 'refreshWebsitesData':
				refreshWebsitesData()
					.then(sendResponse)
					.catch(sendResponse)
					.finally(() => {
						sendDataToPanel()
							.catch(console.error)
						;
					})
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


let websitesData = new Map();
window.websitesData = websitesData
window.baseRequiredPromise.then(async function () {
	refreshWebsitesData();
});
