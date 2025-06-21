(async () => {
	/**
	 *
	 * @type {Map<string, CSSStyleSheet>}
	 */
	const injectedStyles = new Map();

	/**
	 *
	 * @param {string} fileName
	 * @param {string} [css] Undefined to remove it
	 * @return { Promise<CSSStyleSheet|undefined> }
	 */
	const upsertStyle = async (fileName, css) => {
		const currentItem = injectedStyles.get(fileName);
		if (css === undefined) {
			if (currentItem === undefined) return;
			currentItem.disabled = true;
			return currentItem.replace('');
		} else if (currentItem !== undefined) {
            currentItem.disabled = false;
			return currentItem.replace(css);
		} else {
			const styleSheet = new CSSStyleSheet();
			document.adoptedStyleSheets.push(styleSheet);
			styleSheet.disabled = false;
			return styleSheet.replace(css);
		}
	}

	chrome.runtime.onMessage.addListener(function onMessage(message, sender, sendResponse) {
		console.log(message, sender);
		if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return;
		if (message.id !== 'updateInjectedStyles') return;

		if (!Array.isArray(message.data)) {
			sendResponse({ response: 'DATA_SHOULD_BE_ARRAY', isError: true });
			return;
		}

		/**
		 *
		 * @type {Promise<any>[]}
		 */
		const promises = [];
		try {
			for (let item of message.data) {
				promises.push(upsertStyle(item.fileName, item.css)
						.catch(console.error));
			}

			Promise.allSettled(promises)
					.then(results => {
						sendResponse({ response: results, isError: false });
					})
					.catch(e => {
						sendResponse({ response: e.toString(), isError: true });
					});
		} catch (e) {
			console.error(e);
			sendResponse({ response: e.toString(), isError: true });
		}
	});
})().catch(console.error);
true;
