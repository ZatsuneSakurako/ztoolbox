/**
 * @param {string} name
 */
async function triggerOnCurrentTab(name) {
	const win = await browser.windows.getCurrent({
		'populate': true,
		'windowTypes': ['normal']
	});
	const [activeTab] = win.tabs.filter(tab => {
		return tab.hasOwnProperty('active') && tab.active === true;
	});

	if (!activeTab) {
		return;
	}

	const tabPort = browser.tabs.connect(activeTab.id, {
		'name': name
	});
	const promise = new Promise((resolve, reject) => {
		tabPort.onMessage.addListener(result => {
			if (typeof result !== 'string') {
				resolve(result);
				return;
			}

			try {
				resolve(JSON.parse(result));
			} catch (e) {
				console.dir(e);
			}
		});

		tabPort.onDisconnect.addListener(reject);
	});

	return {
		tabPort,
		result: await promise
	};
}

/**
 *
 * @param callback
 */
function onTabChange(callback) {
	browser.windows.onFocusChanged.addListener(callback);
	browser.tabs.onActivated.addListener(callback);
	callback();
}

export {
	triggerOnCurrentTab,
	onTabChange
}