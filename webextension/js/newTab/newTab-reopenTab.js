/**
 *
 * @returns {Promise<chrome.sessions.Session[]>}
 */
async function getLastClosed() {
	return await chrome.sessions.getRecentlyClosed({
		maxResults: 16
	});
}

/**
 *
 * @type {ReturnType<typeof setTimeout>|null}
 */
let reopenTabStateRefresh_timer = null;
export async function reopenTabStateRefresh() {
	if (reopenTabStateRefresh_timer) {
		clearTimeout(reopenTabStateRefresh_timer);
		reopenTabStateRefresh_timer = null;
	}
	reopenTabStateRefresh_timer = setTimeout(_reopenTabStateRefresh, 250);
}
async function _reopenTabStateRefresh() {
	/**
	 *
	 * @type {HTMLSelectElement}
	 */
	const $reopenWindow = document.querySelector('select#reopenWindow');
	if (!$reopenWindow) {
		console.error('Select reopenWindow not found!');
		return;
	}

	const lastClosedSessions = (await getLastClosed()
		.catch(console.error) ?? []);

	for (let option of $reopenWindow.options) {
		if (option.value) option.remove();
	}


	const $clearOption = $reopenWindow.options.namedItem('clear');
	if ($clearOption) {
		$clearOption.disabled = typeof chrome.sessions.forgetClosedWindow !== 'function';
	}


	for (let lastClosedSession of lastClosedSessions) {
		const option = lastClosedSession.tab ?
			new Option(lastClosedSession.tab.title, lastClosedSession.tab.sessionId)
			:
			new Option(lastClosedSession.window.tabs.at(0).title ?? lastClosedSession.window.sessionId, lastClosedSession.window.sessionId);
		if (lastClosedSession.tab) {
			option.dataset.tab = '';
			option.dataset.window = lastClosedSession.tab.windowId;
		}
		$reopenWindow.options.add(option);
	}

	$reopenWindow.disabled = $reopenWindow.options.length <= 1;
	$reopenWindow.value = '';
}

chrome.sessions.onChanged.addListener(function onSessionChange() {
	reopenTabStateRefresh()
		.catch(console.error)
	;
});

document.addEventListener('change', function onReopenWindowChange(ev) {
	/**
	 * @type {HTMLSelectElement}
	 */
	const el = ev.target.closest('select#reopenWindow');
	if (!el) return;

	const selectedItem = el.options.item(el.selectedIndex);
	if (!selectedItem.value && !selectedItem.id) {
		console.warn('Empty reopenWindow value');
		return;
	}

	if (selectedItem.id === "clear") {
		/**
		 *
		 * @type {Promise<any>[]}
		 */
		const promises = [];
		el.disabled = true;

		for (let option of el.options) {
			if (!option.value) continue;

			if (option.dataset.tab !== undefined) {
				if (typeof chrome.sessions.forgetClosedTab === 'function') {
					promises.push(chrome.sessions.forgetClosedTab(parseFloat(option.dataset.window), option.value));
				} else {
					promises.push(Promise.reject('chrome.sessions.forgetClosedTab not supported'));
				}
			} else {
				if (typeof chrome.sessions.forgetClosedWindow === 'function') {
					promises.push(chrome.sessions.forgetClosedWindow(option.value));
				} else {
					promises.push(Promise.reject('chrome.sessions.forgetClosedWindow not supported'));
				}
			}
		}

		Promise.allSettled(promises)
			.then(result => {
				console.error('[clear sessions]', result);
			})
			.catch(console.error)
			.finally(() => {
				el.disabled = false;
				el.options.item(0).selected = true;
				setTimeout(() => {
					reopenTabStateRefresh()
						.catch(console.error);
				});
			});
		return;
	} else if (!selectedItem.value) {
		console.warn('Empty reopenWindow value and id');
		return;
	}

	chrome.sessions.restore(el.value)
		.catch(console.error)
		.finally(() => {
			selectedItem.remove();
			el.value = '';
			reopenTabStateRefresh()
				.catch(console.error);
		});
});
