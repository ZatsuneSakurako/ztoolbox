import {i18ex} from "../translation-api.js";
import {contextMenusController} from "../classes/contextMenusController.js";



function removePlaylistFromUrl(url) {
	const urlObj = new URL(url); // https://developer.mozilla.org/en-US/docs/Web/API/URL - https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
	urlObj.searchParams.delete("list");
	urlObj.searchParams.delete("index");
	return urlObj.toString();
}

async function onStart_contextMenus() {
	await i18ex.loadingPromise;

	contextMenusController.create('OpenWithoutPlaylist', i18ex._("OpenWithoutPlaylist"), ["*.youtube.com/watch?*&list=*","*.youtube.com/watch?list=*"], function (info, tab) {


		if (info.hasOwnProperty("linkUrl")) {
			chrome.tabs.create({ "url": removePlaylistFromUrl(info.linkUrl) })
				.catch(console.error)
			;
		} else {
			chrome.tabs.update(tab.id, {
				"url": removePlaylistFromUrl(tab.url)
			})
				.catch(console.error)
			;
		}
	});
}

onStart_contextMenus()
	.catch(console.error)
;