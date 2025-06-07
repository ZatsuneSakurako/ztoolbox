export async function loadPageDatas(activeTab) {
	return await chrome.scripting.executeScript({
		target: {
			tabId: typeof activeTab === 'object' ? activeTab.id : activeTab,
		},
		injectImmediately: false,
		func: function () {
			return {
				rating: [...document.querySelectorAll('meta[name="rating" i]')].map(n => n.getAttribute('content'))
			}
		}
	})
		.catch(console.error)
	;
}