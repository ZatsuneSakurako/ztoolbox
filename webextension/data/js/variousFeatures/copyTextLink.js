'use strict';

import {default as env} from '../env.js';
const i18ex = window.i18ex;


/**
 *
 * @param {string} string
 * @return {boolean}
 */
function copyToClipboard(string) {
	if (document.querySelector('#copy_form') !== null) {
		let node = document.querySelector('#copy_form');
		node.parentNode.removeChild(node);
	}

	let copy_form = document.createElement('textarea');
	copy_form.id = 'copy_form';
	copy_form.textContent = string;
	//copy_form.class = "hide";
	copy_form.setAttribute('style', 'height: 0 !important; width: 0 !important; border: none !important; z-index: -9999999;');
	document.querySelector('body').appendChild(copy_form);

	//copy_form.focus();
	copy_form.select();

	let clipboard_success = document.execCommand('Copy');
	copy_form.parentNode.removeChild(copy_form);

	return clipboard_success;
}


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
		let clipboardResult = (typeof responseData === 'object' && responseData !== null) && copyToClipboard(responseData.string);

		if (!clipboardResult || (await env) !== 'prod') {
			window.doNotif({
				"message": (clipboardResult) ? i18ex._("copied_link_text") : i18ex._("error_copying_to_clipboard")
			})
		}

		console[(clipboardResult) ? "debug" : "warn"](`Copy to clipboad ${(clipboardResult) ? "success" : "error"} (${responseData?.string})`);
	});
});
