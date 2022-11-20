/**
 *
 * @param {string} url
 * @return {Promise<boolean>}
 */
export async function openTabIfNotExist(url) {
	const tabs = await chrome.tabs.query({});

	let custom_url = url.toLowerCase().replace(/https?:\/\/(?:www\.)?/i,'');
	for (let tab of tabs) {
		// Mean the url was already opened in a tab
		if (tab.url.toLowerCase().indexOf(custom_url) === -1) continue;

		await chrome.tabs.highlight({tabs: tab.index}); // Show the already opened tab
		return true; // Return true to stop the function as the tab is already opened
	}

	if (typeof chrome.windows === 'undefined') {
		const browserWindows = await chrome.windows.getAll({
			populate: false,
			windowTypes: ['normal']
		});

		// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
		if (browserWindows.length === 0) {
			await chrome.windows.create({
				'focused': true,
				'type': 'normal',
				'url': url
			});
		} else{
			await chrome.tabs.create({ 'url': url });
		}
	} else {
		await chrome.tabs.create({ 'url': url });
	}

	return false; // Return false because the url wasn't already in a tab
}