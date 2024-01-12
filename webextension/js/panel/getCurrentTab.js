/**
 *
 * @return {Promise<chrome.tabs.Tab|undefined>}
 */
export async function getCurrentTab() {
	const win = await chrome.windows.getCurrent({
		'populate': true,
		'windowTypes': ['normal']
	});
	return win.tabs.find(tab => {
		return tab.hasOwnProperty('active') && tab.active === true;
	});
}