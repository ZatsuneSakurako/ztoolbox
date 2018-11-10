(function () {
	let rssLinks;

	const detectRssFeeds = function() {
		rssLinks = Array.from(document.querySelectorAll('link[rel="alternate"][type]'));

		rssLinks = rssLinks
			.filter(value => value.type.includes('rss') || value.type.includes('atom'))
			.map(value => {
				return {
					'href': value.href,
					'type': value.type.includes('rss')? 'rss' : 'atom',
					'title': value.title
				}
			})
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
