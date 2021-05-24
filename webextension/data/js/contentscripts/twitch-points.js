(function () {
	const selector = `.community-points-summary[data-test-selector="community-points-summary"] > div:not(:first-child) button[class*="ScCoreButtonSuccess"]`;

	/**
	 *
	 * @type {number|null}
	 */
	let timer = null;
	/**
	 *
	 * @param {HTMLButtonElement} node
	 */
	const autCk = function autCk(node) {
		const timeout = 5000 + Math.round(Math.random() * 5000);
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			console.debug(`[Z-Toolbox] Twitch Points - autCk (${timeout/1000}s)`, node);
			try {
				node.click();
			} catch (e) {
				console.error(e);
			}
		}, timeout);
	}

	/**
	 *
	 * @param {Node} node
	 * @return {boolean}
	 */
	const chkNode = function chkNode(node) {
		if(node.matches(selector)) {
			autCk(node);
			return true;
		}

		return false;
	}

	/**
	 * @type {MutationObserver|null}
	 */
	let currentObserver = null;
	const init = function init() {
		if (!!currentObserver) {
			currentObserver.disconnect();
			currentObserver = null;
		}

		const container = document.querySelector('.chat-room__content .chat-input');
		if (!container) {
			console.debug('[Z-Toolbox] Twitch Points', 'No chat room detected');
			return;
		}

		currentObserver = new MutationObserver(function(mutations) {
			for (let mutation of mutations) {
				const childNode = container.querySelector(':scope ' + selector);
				if (childNode !== null && chkNode(childNode) === true) {
					break;
				}
			}
		});

		console.debug('[Z-Toolbox] Twitch Points', 'Observing...');
		currentObserver.observe(container, { attributes: false, characterData: false, childList: true, subtree: true });
	}


	window.addEventListener('load', function () {
		chrome.runtime.sendMessage({
			"data": {
				"id": "getPreferences",
				"preferences": [
					"twitchPoints"
				]
			},
		}, function(data) {
			if (!(data.preferences.hasOwnProperty('twitchPoints') && data.preferences.twitchPoints === true)) {
				return;
			}

			init();

			let currentUrl = location.href;
			setInterval(() => {
				if (location.href === currentUrl) {
					return;
				}

				currentUrl = location.href;
				try {
					init();
				} catch (e) {
					console.error(e);
				}
			}, 5000);
		});
	});
})();