import {renderTemplate} from '../init-templates.js';
import {appendTo} from "../utils/appendTo.js";

const tabMover = document.querySelector('#tabMover');
/**
 *
 * @type {chrome.windows.Window[]}
 */
let browserWindows;
const TAB_MOVER_TEMPLATE = 'tabMover';
async function update() {
	const currentBrowserWindow = await chrome.windows.getCurrent({
		populate: false,
		windowTypes: ["normal"]
	});
	browserWindows = await chrome.windows.getAll({
		populate: true,
		windowTypes: ["normal"]
	});

	browserWindows = browserWindows
		.filter(window => {
			return window.incognito !== true && window.id !== currentBrowserWindow.id
		})
		.map(window => {
			window.currentTabTitle = null;

			const activeTab = window.tabs.find(tab => tab.active);
			if (activeTab) {
				window.currentTabTitle = activeTab.title;
			}

			return window;
		})
	;

	while (tabMover.hasChildNodes()) {
		tabMover.removeChild(tabMover.lastChild);
	}
	if (browserWindows.length) {
		for (const win of browserWindows) {
			appendTo(
				tabMover,
				await renderTemplate(TAB_MOVER_TEMPLATE, {
					'title': i18ex._("windowId", {
						"windowId": win.id
					}),
					'windowId': win.id,
					'tabName': win.currentTabTitle ?? '',
					'tabsCount': win.tabs.length
				}),
				document
			);
		}
	} else {
		appendTo(
			tabMover,
			await renderTemplate(TAB_MOVER_TEMPLATE, {
				'title': i18ex._("newWindow"),
				'windowId': '',
				'tabName': ''
			}),
			document
		);
	}

	return true;
}

document.addEventListener('click', e => {
	const elm = e.target.closest('.tabMover[data-window-id]');
	if (!elm) return;

	chrome.tabs.query({
		currentWindow: true,
		active: true
	})
		.then(async ([activeTab]) => {
			if (!activeTab) {
				console.warn('no active tab found');
				return;
			}

			const winId = parseInt(elm.dataset.windowId);
			if (!winId || isNaN(winId)) {
				await chrome.windows.create({
					"tabId": activeTab.id
				})
					.catch(console.error)
				;
			} else {
				await chrome.tabs.move(activeTab.id, {
					"windowId": winId,
					"index": -1
				})
					.catch(console.error)
				;
			}

			await chrome.tabs.update(activeTab.id, {
				"active": activeTab.active
			})
				.catch(console.error)
			;

			window.close()
		})
		.catch(console.error)
	;
});



update()
	.catch(console.error)
;

chrome.windows.onCreated.addListener(update);
chrome.windows.onRemoved.addListener(update);
chrome.windows.onFocusChanged.addListener(update);
chrome.tabs.onUpdated.addListener(function (info, changeInfo, tab) {
	if (tab.active === true && ((changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") || changeInfo.hasOwnProperty("title"))) {
		// Only update context menu if the active tab have a "complete" load
		update()
			.catch(console.error)
		;
	}
});
