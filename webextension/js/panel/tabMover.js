import {throttle} from "../../lib/throttle.js";
import {getPreference} from "../classes/chrome-preferences.js";

/**
 *
 * @type {chrome.windows.Window[]}
 */
let browserWindows;
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

	/**
	 * @type {HTMLElement}
	 */
	const tabMoverButton = document.querySelector('#tabMover'),
		tabList = tabMoverButton.querySelector('ul.data.tab-list');
	while (tabList.hasChildNodes()) {
		tabList.removeChild(tabList.lastChild);
	}

	const panelAlwaysShowMoveInNewWindow = !!(await getPreference('panelAlwaysShowMoveInNewWindow')
		.catch(console.error));
	if (tabMoverButton.classList.toggle('hide', !(browserWindows.length || panelAlwaysShowMoveInNewWindow))) {
		return;
	}

	/**
	 *
	 * @type {HTMLTemplateElement}
	 */
	const templateItem = document.querySelector('template#tabMoverItemTemplate');

	if (browserWindows.length) {
		for (const win of browserWindows) {
			/**
			 * @type {HTMLElement}
			 */
			const resultItem = templateItem.content.cloneNode(true),
				resultItemLi = resultItem.children.item(0);

			const $button = resultItem.querySelector('button');
			$button.dataset.windowId = win.id;

			resultItemLi.style.setProperty('--title', JSON.stringify(chrome.i18n.getMessage("windowId", win.tabs.length.toString())));
			resultItemLi.style.setProperty('--subtitle', JSON.stringify(win.currentTabTitle ?? win.id.toString()));

			tabList.appendChild(resultItem);
		}
	}

	const shouldDisplayNewWindow = !browserWindows.length || panelAlwaysShowMoveInNewWindow;
	if (shouldDisplayNewWindow) {
		/**
		 * @type {HTMLElement}
		 */
		const resultItem = templateItem.content.cloneNode(true),
			resultItemLi = resultItem.children.item(0);

		resultItemLi.style.setProperty('--title', JSON.stringify(chrome.i18n.getMessage("newWindow")));

		tabList.appendChild(resultItem);
	}

	return true;
}

document.addEventListener('click', e => {
	const elm = e.target.closest('.tabMover [data-window-id]');
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
					.catch(console.error);
			} else {
				await chrome.tabs.move(activeTab.id, {
					"windowId": winId,
					"index": -1
				})
					.catch(console.error);
			}

			await chrome.tabs.update(activeTab.id, {
				"active": activeTab.active
			})
				.catch(console.error);

			window.close();
		})
		.catch(console.error)
	;
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('.tabMover[data-browser-name]');
	if (!elm || !elm.dataset.browserName) return;

	const [activeTab] = await chrome.tabs.query({
		currentWindow: true,
		active: true,
		windowType: 'normal'
	});
	if (!activeTab) return;

	chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'ztoolbox_nativeOpenUrl',
		data: {
			browserName: elm.dataset.browserName,
			url: activeTab.url
		}
	}, function (result) {
		console.log('[nativeOpenUrl]', result);
		if (!result.isError && !!result.response) {
			chrome.tabs.remove(activeTab.id)
				.catch(console.error)
			;
			window.close();
		}
	});
});



const _update = throttle(() => {
	update()
		.catch(console.error)
	;
}, 50);

_update();

chrome.windows.onCreated.addListener(_update);
chrome.windows.onRemoved.addListener(_update);
chrome.windows.onFocusChanged.addListener(_update);
chrome.tabs.onUpdated.addListener(function (info, changeInfo, tab) {
	if (tab.active === true && ((changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") || changeInfo.hasOwnProperty("title"))) {
		// Only update context menu if the active tab have a "complete" load
		_update();
	}
});
