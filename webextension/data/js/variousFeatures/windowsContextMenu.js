'use strict';

import {ZDK} from "../classes/ZDK.js";

let browserWindows = appGlobal["windows"] = [],
	linkWindowContextMenu_subMenu = new Map()
;


async function getCurrentWindowIds() {
	if (linkWindowContextMenu === null) {
		return;
	}

	browserWindows = await browser.windows.getAll({
		populate: false,
		windowTypes: ["normal"]
	});

	browserWindows.forEach(function (window, index, array) {
		if (window.incognito === true) {
			array.splice(index, 1);
		}
	});

	console.dir(browserWindows)

	await browser.contextMenus.update(linkWindowContextMenu, {
		"enabled": browserWindows.length > 1,
		"title": browserWindows.length > 1 ? i18ex._("open_link_to_window") : i18ex._("no_other_window")
	});

	for (let [browserWindowId, subMenuId] of linkWindowContextMenu_subMenu) {
		await browser.contextMenus.remove(subMenuId);
		linkWindowContextMenu_subMenu.delete(browserWindowId);
	}

	if (browserWindows.length > 2) {
		for (const browserWindow of browserWindows) {
			const [activeTab] = await browser.tabs.query({
				"active": true,
				"windowId": browserWindow.id,
				"windowType": "normal"
			});

			linkWindowContextMenu_subMenu.set(
				browserWindow.id,
				browser.contextMenus.create({
					"id": "winTab_link_" + browserWindow.id,
					"contexts": [
						"link"
					],
					"enabled": true,
					"parentId": linkWindowContextMenu,
					"title": i18ex._("window_windowId", {
						"windowId": browserWindow.id,
						"window": ZDK.stringEllipse(activeTab.title, 25)
					})
				})
			);
		}
	}

	await windowContextMenu_update();
	return browserWindows;
}


async function linkWindowContextMenu_onClick(info, tab) {
	let action_windowId = null,
		tabIsActive = tab.active
	;


	if (linkWindowContextMenu_subMenu.size > 0) {
		let browserWindowTarget = null;
		linkWindowContextMenu_subMenu.forEach((subMenuId, browserWindowId) => {
			if (browserWindowTarget === null) {
				if (subMenuId === info.menuItemId) {
					browserWindowTarget = browserWindowId;
				}
			}
		});

		if (browserWindowTarget !== null) {
			action_windowId = browserWindowTarget;
		}
	} else {
		action_windowId = (browserWindows[0].id !== tab.windowId) ? browserWindows[0].id : browserWindows[1].id;
	}

	if (action_windowId === null) {
		throw "Cound not get Window";
	}

	browser.tabs.create({
		"windowId": action_windowId,
		"url": info.linkUrl
	});

	await browser.tabs.update(tab.id, {
		"active": tabIsActive
	});
}


async function windowContextMenu_update() {
	if (!!browserWindows && browserWindows.length > 2) {
		const currentBrowserWindow = await browser.windows.getCurrent({
			populate: false,
			windowTypes: ["normal"]
		});

		for (let [browserWindowId, subMenuId] of linkWindowContextMenu_subMenu) {
			const [activeTab] = await browser.tabs.query({
				"active": true,
				"windowId": browserWindowId,
				"windowType": "normal"
			});

			if (activeTab !== undefined) {
				await browser.contextMenus.update(subMenuId, {
					"enabled": currentBrowserWindow.id !== browserWindowId,
					"title": i18ex._("window_windowId", {
						"windowId": browserWindowId,
						"window": ZDK.stringEllipse(activeTab.title, 25)
					})
				});
			}
		}
	}
}


/**
 *
 * @type {number|null}
 */
let linkWindowContextMenu = null;
window.baseRequiredPromise.then(function () {
	let linkContextMenuParams = {
		"id": "winTab_link_no_others",
		"contexts": [
			"link"
		],
		"enabled": false,
		"icons": {
			"16": "/data/images/ic_open_in_browser_black_24px.svg"
		},
		"title": i18ex._("no_other_window")
	};
	try {
		linkWindowContextMenu = browser.contextMenus.create(linkContextMenuParams);
	} catch (err) {
		if (err.toString().indexOf('icons') === -1) {
			console.warn(err);
		}

		delete linkContextMenuParams.icons;
		linkWindowContextMenu = browser.contextMenus.create(linkContextMenuParams);
	}

	getCurrentWindowIds()
		.catch(console.error)
	;
});
chrome.contextMenus.onClicked.addListener(function (info, tab) {
	if (info.menuItemId === 'winTab_link_no_others') {
		return linkWindowContextMenu_onClick(info, tab)
			.catch(console.error)
		;
	} else if (info.menuItemId.startsWith('winTab_link_')) {
		linkWindowContextMenu_onClick(info, tab)
			.catch(console.error)
		;
	}
});


browser.windows.onCreated.addListener(getCurrentWindowIds);
browser.windows.onRemoved.addListener(getCurrentWindowIds);
browser.windows.onFocusChanged.addListener(windowContextMenu_update);
browser.tabs.onUpdated.addListener(function (info, changeInfo, tab) {
	if (tab.active === true && ((changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") || changeInfo.hasOwnProperty("title"))) {
		// Only update context menu if the active tab have a "complete" load
		windowContextMenu_update.call(this, tab.windowId)
			.catch(console.error)
		;
	}
});
