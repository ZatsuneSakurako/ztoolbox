'use strict';

import {default as env} from '../env.js';
import {copyToClipboard} from '../copyToClipboard.js';
const i18ex = window.i18ex;


window.baseRequiredPromise.then(() => {
	chrome.contextMenus.create({
		id: 'link_CopyTextLink',
		title: i18ex._("copy_link_text"),
		contexts: ["link"],
		targetUrlPatterns: ["<all_urls>"]
	});
});


chrome.contextMenus.onClicked.addListener(function (info, tab) {
	chrome.tabs.sendMessage(tab.id, {
		id: "copyLinkText",
		data: ""
	}, async function (responseData) {
		let clipboardResult = (typeof responseData === 'object' && responseData !== null) && await copyToClipboard(responseData.string);

		if (!clipboardResult || (await env) !== 'prod') {
			window.doNotif({
				"message": (clipboardResult) ? i18ex._("copied_link_text") : i18ex._("error_copying_to_clipboard")
			})
		}

		console[(clipboardResult) ? "debug" : "warn"](`Copy to clipboad ${(clipboardResult) ? "success" : "error"} (${responseData?.string})`);
	});
});
