export async function loadTabOpenGraph(activeTab) {
	return await chrome.scripting.executeScript({
		target: {
			tabId: typeof activeTab === 'object' ? activeTab.id : activeTab,
		},
		files: [
			'/js/contentscripts/openGraphData.js'
		],
		injectImmediately: true
	})
		.catch(console.error)
	;
}