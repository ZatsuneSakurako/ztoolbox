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
 * @param {string} sessionId
 * @return {Promise<void>}
 */
async function reopenLastClosed(sessionId) {
	await chrome.sessions.restore(sessionId);
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

	for (let lastClosedSession of lastClosedSessions) {
		$reopenWindow.options.add(
			lastClosedSession.tab ?
			new Option(lastClosedSession.tab.title, lastClosedSession.tab.sessionId)
			:
			new Option(lastClosedSession.window.tabs.at(0).title ?? lastClosedSession.window.sessionId, lastClosedSession.window.sessionId)
		);
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
	if (!selectedItem.value) {
		console.warn('Empty reopenWindow value');
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
