(function () {
	let rssLinks;

	const detectRssFeeds = function() {
		rssLinks = Array.from(document.querySelectorAll('link[rel="alternate"][type]'));

		rssLinks = rssLinks
			.map(value => {
				return {
					'href': value.href,
					'type': value.type,
					'title': value.title
				}
			})
			.filter(value => value.type.includes('rss') || value.type.includes('atom'))
		;
	};

	chrome.runtime.onConnect.addListener(function (port) {
		if (port.sender.id === chrome.runtime.id && port.name === 'ztoolbox_rss-retrieve') {
			if (rssLinks === undefined) {
				detectRssFeeds();
			}

			port.postMessage(rssLinks);
		}

		port.disconnect();
	});
})();
