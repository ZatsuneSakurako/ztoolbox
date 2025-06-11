(async () => {
	await chrome.contextMenus.create({
		id: 'newTab_refreshLinkImage',
		title: chrome.i18n.getMessage("newTab_refreshLinkImage"),
		contexts: ["link"],
		targetUrlPatterns: ["<all_urls>"],
		documentUrlPatterns: [
			chrome.runtime.getURL('newTab.html') + '*'
		]
	});
})()
	.catch(console.error)
;

chrome.contextMenus.onClicked.addListener(function onNewTab_refreshLinkImage(info, tab) {
	if (info.menuItemId !== 'newTab_refreshLinkImage') {
		return;
	}

	chrome.tabs.sendMessage(tab.id, {
		name: "newTab_refreshLinkImage",
		data: info
	})
		.catch(console.error)
	;
});
