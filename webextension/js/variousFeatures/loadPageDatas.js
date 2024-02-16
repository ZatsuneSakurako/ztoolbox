export async function loadPageDatas(activeTab) {
	return await chrome.scripting.executeScript({
		target: {
			tabId: typeof activeTab === 'object' ? activeTab.id : activeTab,
		},
		injectImmediately: false,
		world: 'MAIN',
		func: function () {
			return {
				openGraphData: Object.fromEntries(
					new Map([...
						document.querySelectorAll('meta[property^="og:"]')]
						.map(node => {
							return [
								node.getAttribute('property')?.substring(3),
								node.content
							]
						})
					)
				),
				rating: [...document.querySelectorAll('meta[name="rating" i]')].map(n => n.getAttribute('content'))
			}
		}
	})
		.catch(console.error)
	;
}