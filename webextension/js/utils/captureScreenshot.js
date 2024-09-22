/**
 *
 * @returns {Promise<void>}
 */
function waitPageIdle() {
	return new Promise(resolve => {
		let timer = null;
		new MutationObserver((_, observer) => {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}

			timer = setTimeout(() => {
				resolve(true);
				observer.disconnect();
			}, 2000);
		}).observe(document.body, { attributes: false, childList: true, subtree: true });
	})
}

/**
 *
 * @param { {url:string, open: 'tab'|'popup'} } opts
 * @param {number} [ms]
 * @returns {Promise<chrome.tabs.Tab>}
 */
function loadUrl(opts, ms = 5_000) {
	return new Promise(async (resolve, reject) => {
		if (typeof opts.url !== 'string' || !['tab','popup'].includes(opts.open)) {
			reject(new Error('INVALID_ARGUMENTS'));
			return;
		}

		let tab = null;
		const clearListeners = () => {
			clearTimeout(timer);
			chrome.webRequest.onCompleted.removeListener(callback);
		};

		/**
		 *
		 * @param {WebResponseCacheDetails} details
		 */
		const callback = async function callback(details) {
			if (!tab || details.tabId !== tab.id) return;

			resolve(tab);
			try {
				clearListeners();
			} catch (e) {
				console.error(e)
			}
		}

		const timer = setInterval(() => {
			reject(new Error('Timeout with tabId ' + tab?.id));
			try {
				clearListeners()
			} catch (e) {
				console.error(e)
			}
		}, ms);

		chrome.webRequest.onCompleted.addListener(callback, { urls: ['<all_urls>'] });
		switch (opts.open) {
			case 'popup':
				const window = await chrome.windows.create({
						url: opts.url,
						focused: false,
						height: 420,
						width: 800,
						type: opts.open,
					})
						.catch(console.error)
				;
				tab = window?.tabs.at(0);
				break;
			case 'tab':
				tab = await chrome.tabs.create({
					url: opts.url,
					active: false,
				});
				break;
		}
	})
}

/**
 *
 * @param {string} url
 * @returns {Promise<string|null>} base64 url
 */
export async function generateThumbnail(url) {
	const tab = await loadUrl({
		url,
		open: 'popup',
	})
		.catch(console.error)
	;
	const result = await chrome.scripting.executeScript({
		func: waitPageIdle,
		target : {
			tabId: tab.id,
			allFrames: false
		},
	})
		.catch(console.error)
	;
	if (result.at(0).result !== true) {
		console.error('Wait page idle error with ', url);
	}

	/**
	 *
	 * @type {string|null}
	 */
	let base64result = null;
	try {
		await chrome.windows.update(tab.windowId, { focused: true, state: 'normal' });
		await chrome.tabs.update(tab.id, { active: true });

		base64result = await chrome.tabs.captureVisibleTab(tab.windowId, {
			format: 'png'
		});
	} catch (e) {
		console.error(e);
	}

	await chrome.tabs.remove(tab.id)
		.catch(console.error)
	;
	return base64result;
}
