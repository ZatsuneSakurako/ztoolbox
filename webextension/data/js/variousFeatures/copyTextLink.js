'use strict';

import {default as env} from '../env.js';



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
	});
});

async function onCopyLinkTextReply(responseData) {
	const clipboardResult = responseData.result;
	if (!clipboardResult || env !== 'prod') {
		window.doNotif({
			'id': 'copy_link_result',
			"message": (clipboardResult) ? i18ex._("copied_link_text") : i18ex._("error_copying_to_clipboard")
		})
	}

	console[(clipboardResult) ? "debug" : "warn"](`Copy to clipboad ${(clipboardResult) ? "success" : "error"}`, responseData);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		console.error(sender.id)
		return;
	}

	if (typeof message === "object" && message.hasOwnProperty("data")) {
		if (message.id === "copyLinkText_reply") {
			onCopyLinkTextReply(message.data)
				.catch(console.error)
			;
		}
	}
});