const tabMover = document.querySelector('#tabMover');
/**
 *
 * @type {browser.windows.Window[]}
 */
let browserWindows;
async function update() {
	/**
	 *
	 * @type {Window}
	 */
	const backgroundPage = await browser.runtime.getBackgroundPage();
	const tabMoverTemplate = backgroundPage.appGlobal.mustacheTemplates.get('tabMover');
	if (!tabMoverTemplate) {
		console.warn('tabMover template missing');
		return false;
	}


	const currentBrowserWindow = await browser.windows.getCurrent({
		populate: false,
		windowTypes: ["normal"]
	});
	browserWindows = await browser.windows.getAll({
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

	const i18ex = backgroundPage.i18ex;
	while (tabMover.hasChildNodes()) {
		tabMover.removeChild(tabMover.lastChild);
	}
	for (const win of browserWindows) {
		backgroundPage.zDK.appendTo(
			tabMover,
			backgroundPage.Mustache.render(tabMoverTemplate, {
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

	return true;
}

document.addEventListener('click', e => {
	const elm = e.target.closest('.tabMover[data-window-id]');
	if (!elm) return;

	browser.tabs.query({
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
				console.warn('no valid window target');
				return;
			}
			await browser.tabs.move(activeTab.id, {
				"windowId": winId,
				"index": -1
			})
				.catch(console.error)
			;

			await browser.tabs.update(activeTab.id, {
				"active": activeTab.active
			})
				.catch(console.error)
			;
		})
		.catch(console.error)
	;
});



update()
	.catch(console.error)
;

browser.windows.onCreated.addListener(update);
browser.windows.onRemoved.addListener(update);
browser.windows.onFocusChanged.addListener(update);
browser.tabs.onUpdated.addListener(function (info, changeInfo, tab) {
	if (tab.active === true && ((changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") || changeInfo.hasOwnProperty("title"))) {
		// Only update context menu if the active tab have a "complete" load
		update();
	}
});
