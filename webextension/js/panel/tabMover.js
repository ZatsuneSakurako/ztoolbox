/**
 *
 * @param {string} str
 * @param {number} maxLength
 * @return {string}
 */
function truncateString(str, maxLength=25) {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 3) + '...';
}

/**
 *
 * @type {chrome.windows.Window[]}
 */
let browserWindows;
export const tabMoverItemId = '__tabMover';
export async function update() {
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
	const tabMoverButton = document.querySelector('#userscript-__tabMover');
	if (!browserWindows.length) {
		tabMoverButton && tabMoverButton.remove();
		return;
	}

	/**
	 *
	 * @type {RegisterMenuCommand[]}
	 */
	const menuCommands = [];
	for (const win of browserWindows) {
		menuCommands.push({
			id: 'tabMover-' + win.id,
			fileName: tabMoverItemId,
			order: menuCommands.length,

			name: `${truncateString(win.currentTabTitle ?? win.id.toString())} (${win.tabs.length})`,
			title: win.currentTabTitle ?? win.id.toString(),
			icon: 'tab_move',
			autoClose: true,
		});
	}

	return {
		title: 'Tab mover',
		data: {
			id: tabMoverItemId,
			enabled: true,
			runAt: 'manual',
			icon: 'swap_horiz',
			fileName: tabMoverItemId,
			tags: [],
			menuCommands,
			isScriptExecuted: true,
			isCss: false,
			isScript: true,
		},
	};
}

/**
 *
 * @param {string} windowId
 */
export async function tabMover_mvTab(windowId) {
	const [activeTab] = await chrome.tabs.query({ currentWindow: true, active: true });
	if (!activeTab) {
		console.warn('no active tab found');
		return;
	}

	const winId = parseInt(windowId);
	if (!winId || isNaN(winId)) {
		throw new Error('INVALID_WINDOW_ID');
	}

	await chrome.tabs.move(activeTab.id, {
		"windowId": winId,
		"index": -1,
		"active": activeTab.active,
	}).catch(console.error);
}

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
