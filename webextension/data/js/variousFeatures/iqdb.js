'use strict';

import {i18ex} from "../translation-api.js";
import {contextMenusController} from "../contextMenusController.js";

async function launchSearch(tab, imgUrl) {
	try {
		const response = await browser.tabs.sendMessage(
			tab.id,
			{
				name: 'ztoolbox_iqdb_launch_search',
				imgUrl: imgUrl
			}
		);

		if (typeof response !== 'object' || !!response.isError) {
			console.group();
			console.log('[ContentScript] Error from iqdb :');
			console.error(response.response);
			console.groupEnd();
		}
	} catch (e) {
		console.error(e);
	}
}

i18ex.loadingPromise.then(async function() {
	contextMenusController.createImage('SearchOnIqdb', i18ex._('SearchOnIqdb'), ['*/*'], onIqdbMenuClick);
})

async function onIqdbMenuClick(info) {
	let createdTab;



	const unloadEvent = () => {
		browser.tabs.onUpdated.removeListener(onTabLoad);
		clearTimeout(timeout);
	};
	const onTabLoad = function onTabLoad(tabId, changeInfo, tab) {
		if (!!createdTab && tabId !== createdTab.id) {
			return;
		}

		if (changeInfo.status === 'complete') {
			unloadEvent();
			launchSearch(tab, info.srcUrl)
				.catch(console.error)
			;
		}
	};

	browser.tabs.onUpdated.addListener(onTabLoad);

	let timeout = setTimeout(() => {
		unloadEvent();
	}, 60000);



	try {
		createdTab = await browser.tabs.create({
			url: 'https://iqdb.org/'
		});
	} catch (e) {
		console.error(e);
		unloadEvent();
	}
}