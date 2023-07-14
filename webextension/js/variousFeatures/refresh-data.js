'use strict';

import {getPreference, getPreferences} from "../classes/chrome-preferences.js";
import {
	getWebsitesApis,
	loadStoredWebsitesData
} from "./refresh-data-loader.js";

let isRefreshingData = false;
self.refreshWebsitesData = refreshWebsitesData;
export async function refreshWebsitesData() {
	if (isRefreshingData === true) {
		console.warn('Already refreshing...');
		return false;
	}

	isRefreshingData = true;
	const dateStart = new Date();


	const preferences = await getPreferences('mode', 'check_enabled');
	if (!preferences.get('check_enabled')) {
		isRefreshingData = false;

		const logs = [];
		if (!preferences.get('check_enabled')) {
			logs.push('check_enable false');
		}
		console.info(`Refresh disabled (${logs.join(', ')})`);

		return false;
	}


	const websitesData = await loadStoredWebsitesData();


	console.debug('Refreshing websites data...');
	const websites = await getWebsitesApis(),
		promises = []
	;
	for (let [website, websiteAPI] of Object.entries(websites)) {
		const promise = refreshWebsite(website, websiteAPI, websitesData.get(website));
		promises.push(promise);
		promise
			.catch((data) => {
				console.log('refreshWebsitesData', data);
			})
		;
	}

	const data = await Promise.allSettled(promises)
		.catch(console.error)
	;

	if (await getPreference('showAdvanced') === true) {
		console.groupCollapsed('Websites check end');
		console.info('Start :', dateStart.toLocaleString());
		console.info('End :', new Date());
		console.log('fetchResponses:', data);
		console.log('Data:', websitesData);
		console.groupEnd();
	}


	const output = {};
	for (let [website, data] of websitesData) {
		output[website] = data.toJSON();
	}

	isRefreshingData = false;
	return output;
}


chrome.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === 'REFRESH_DATA') {
		chrome.alarms.clear(alarm.name)
			.catch(console.error)
		;
	}
});


/**
 *
 * @param {string} website
 * @param websiteAPI
 * @param {WebsiteData} websiteData
 * @return {Promise<null>}
 */
async function refreshWebsite(website, websiteAPI, websiteData) {
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
