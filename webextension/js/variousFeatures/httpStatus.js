import {tabPageServerIpStorage, updateData} from "./tabPageServerIp.js";
import {webRequestFilter} from "../constants.js";

export async function updateBadge(tabId) {
	const rawDatas = (await chrome.storage.session.get([tabPageServerIpStorage])),
		data = rawDatas[tabPageServerIpStorage][tabId]
	;

	let color = '#3B3B3B';
	if (data?.statusCode >= 500) {
		color = '#BA0000';
	} else if (data?.statusCode >= 400) {
		color = '#DE5500';
	} else if (data?.statusCode >= 300) {
		color = '#0062A3';
	} else if (data?.statusCode >= 200) {
		color = '#078F00';
	}

	chrome.action.setBadgeText({
		tabId: tabId,
		text: data.statusCode?.toString() ?? '',
	})
		.catch(console.error)
	;
	chrome.action.setBadgeBackgroundColor({
		tabId: tabId,
		color
	})
		.catch(console.error)
	;
	chrome.action.setBadgeTextColor({
		tabId: tabId,
		color: '#ebebeb'
	})
		.catch(console.error)
	;
}

chrome.webRequest.onHeadersReceived.addListener(function (details) {
	updateData({
		statusCode: details.statusCode,
		requestId: details.requestId,
	})
		.catch(console.error)
	;
}, webRequestFilter, ['responseHeaders']);

chrome.webRequest.onCompleted.addListener(function (details) {
	updateData({
		statusCode: details.statusCode,
		requestId: details.requestId,
	})
		.catch(console.error)
	;
}, webRequestFilter);
