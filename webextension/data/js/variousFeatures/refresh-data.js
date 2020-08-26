'use strict';

import { PromiseWaitAll } from '../classes/PromiseWaitAll.js';
import { Request } from '../classes/Request.js';
import { ZDK } from "../classes/ZDK.js";



function doNotifyWebsite(website){
	let websiteAPI = websites.get(website),
		websiteData = websitesData.get(website),
		foldersList = ''
	;

	let notificationList = [],
		labelArray = [];

	if (websiteData.logged) {
		if (websiteData.hasOwnProperty('folders')) {
			websiteData.folders.forEach((folderData, name) => {
				let count = folderData.folderCount;
				if (typeof count === "number" && !isNaN(count) && count > 0) {
					let suffix = '';
					if(websiteData.notificationState.count !== null && websiteData.count > websiteData.notificationState.count){
						suffix=` (+${websiteData.count - websiteData.notificationState.count})`;
					}
					labelArray.push(`${name}: ${count}${suffix}`);
					notificationList.push({"title": `${(typeof folderData.folderName === 'string')? folderData.folderName : name}: `, 'message': count.toString()});
				}
			});
			foldersList += labelArray.join("\n");
		}
	}

	if (!websiteData.logged) {
		const oldLoggedState = websiteData.notificationState.logged;
		if (oldLoggedState === true || oldLoggedState === undefined) {
			doNotif({
				'title': i18ex._('website_notif', {'website': website}),
				'message': i18ex._('website_not_logged', {'website': website}),
				'iconUrl': websiteData.websiteIcon
			})
				.then(() => {
					ZDK.openTabIfNotExist(websiteAPI.getLoginURL(websiteData))
						.catch(ZDK.console.error)
					;
				})
				.catch(ZDK.console.error)
			;
		}
		websiteData.notificationState.logged = websiteData.logged;
	} else if (typeof websiteData.count === 'number' && !isNaN(websiteData.count) && (websiteData.notificationState.count === null || websiteData.count > websiteData.notificationState.count)) {
		if (getPreference('notify_checkedData')) {
			doNotif({
				"title": i18ex._('website_notif', {'website': website}),
				"message": i18ex._('count_new_notif', {'count': websiteData.count}) + "\n" + foldersList,
				"iconUrl": websiteData.websiteIcon
			})
				.then(() => {
					ZDK.openTabIfNotExist(websiteAPI.getViewURL(websiteData))
						.catch(ZDK.console.error)
					;
				})
				.catch(ZDK.console.error)
			;
		}

		if (getPreference('notify_vocal')) {
			voiceReadMessage(i18ex._('language'), i18ex._('count_new_notif', {'count': websiteData.count}));
		}

	} else if (getPreference('notify_all_viewed') && (typeof websiteData.count === 'number' && websiteData.count === 0) && (typeof websiteData.notificationState.count === 'number' && websiteData.notificationState.count > 0)) {
		doNotif({
			"title": i18ex._('website_notif', {'website': website}),
			"message": i18ex._('all_viewed'),
			"iconUrl": websiteData.websiteIcon
		})
			.then(() => {
				ZDK.openTabIfNotExist(websiteAPI.getViewURL(websiteData))
					.catch(ZDK.console.error)
				;
			})
			.catch(ZDK.console.warn)
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
async function refreshWebsitesData() {
	if (isRefreshingData === true) {
		ZDK.console.warn('Already refreshing...');
		return false;
	}

	isRefreshingData = true;

	ZDK.console.debug('Refreshing websites data...');
	let promises = new Map();

	websites.forEach((websiteAPI, website) => {
		promises.set(website, refreshWebsite(website));
		promises.get(website)
			.then(() => {
				if (appGlobal["notificationGlobalyDisabled"] === false) {
					doNotifyWebsite(website);
				}
			})
			.catch((data) => {
				ZDK.console.log('refreshWebsitesData', data);
			});
	});

	const data = await PromiseWaitAll(promises);

	clearInterval(interval);
	interval = setInterval(refreshWebsitesData, getPreference('check_delay') * 60000);

	setTimeout(() => {
		isRefreshingData = false;
	}, 5 * 1000);


	let count = null;
	websitesData.forEach((websiteData, website) => {
		if (websiteData.logged && websiteData.count !== null) {
			if (count === null) {
				count = 0;
			}
			count += websiteData.count;
		}
	});

	ZDK.console.groupCollapsed('Websites check end');
	ZDK.console.log('fetchResponses:', data);
	ZDK.console.log('Data:', websitesData);
	ZDK.console.groupEnd();

	// chrome.browserAction.setTitle({title: (count === null)? i18ex._("no_website_logged") : label});

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

	return data;
}
appGlobal["refreshWebsitesData"] = refreshWebsitesData;


async function refreshWebsite(website) {
	let data = null, request = null;
	if (typeof websites.get(website).getData === 'function') {
		try {
			const result = await websites.get(website).getData();
			data = result.data;
			request = result.response;
		} catch (e) {
			ZDK.console.error(e);
		}
	} else {
		try {
			request = await Request({
				url: websites.get(website).dataURL,
				overrideMimeType: 'text/html; charset=utf-8',
				contentType: 'document',
				Request_documentParseToJSON: websites.get(website).Request_documentParseToJSON
			}).get();

			data = request.map;
		} catch (e) {
			ZDK.console.error(e);
		}
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
		return request;
	} else {
		ZDK.console.warn(`Error retrieving page for "${website}"`);
		//let websiteData = websitesData.get(website);
		//websiteData.logged  = false;
		return request;
	}
}


let interval,
	websites = new Map(),
	websitesData = new Map()
;
appGlobal["websites"] = websites;
appGlobal["websitesData"] = websitesData;
(async function(){
	const { deviantArt } = await import('../platforms/deviantart.js');
	websites.set('deviantArt', deviantArt);

	websites.forEach((websiteAPI, website) => {
		websitesData.set(website, new websiteDefaultData());
	});

	refreshWebsitesData();
})();
