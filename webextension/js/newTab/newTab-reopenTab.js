/**
 *
 * @returns {Promise<chrome.sessions.Session[]>}
 */
async function getLastClosed() {
	return await chrome.sessions.getRecentlyClosed({
		maxResults: 1
	});
}

async function reopenLastClosed() {
	/**
	 * @type {chrome.sessions.Session|undefined}
	 */
	const lastClosedSession = (await getLastClosed()
		.catch(console.error) ?? []).at(0)
	;
	if (lastClosedSession && typeof lastClosedSession.tab?.sessionId === 'string') {
		await chrome.sessions.restore(lastClosedSession.tab.sessionId);
	}
}

export async function reopenTabStateRefresh() {
	const $reopenWindow = document.querySelector('#reopenWindow');
	if ($reopenWindow) {
		const hasLastClosed = ((await getLastClosed().catch(console.error)) ?? []).length > 0;
		$reopenWindow.disabled = !hasLastClosed;
	} else {
		console.error('Button reopenWindow not found!')
	}
}

chrome.sessions.onChanged.addListener(function onSessionChange() {
	reopenTabStateRefresh()
		.catch(console.error)
	;
});

document.addEventListener('click', function onReopenWindowClick(ev) {
	const el = ev.target.closest('#reopenWindow');
	if (!el) return;

	reopenLastClosed()
		.catch(console.error)
	;
});
