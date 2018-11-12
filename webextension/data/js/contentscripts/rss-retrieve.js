(function () {
	let rssLinks;



	const clearRssLinks = function () {
		rssLinks = undefined;
	};
	window.addEventListener('popstate', clearRssLinks, true);
	window.addEventListener("hashchange", clearRssLinks, true);





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



	const onConnect = function (port) {
		if (port.sender.id === chrome.runtime.id && port.name === 'ztoolbox_rss-retrieve') {
			if (rssLinks === undefined) {
				detectRssFeeds();
			}

			port.postMessage(rssLinks);
		}

		port.disconnect();
	};
	let timeout;
	chrome.runtime.onConnect.addListener(function (port) {
		if (timeout === undefined) {
			timeout = setTimeout(() => {
				onConnect(port);
			}, 100)
		} else {
			onConnect(port);
		}
	});

	chrome.runtime.sendMessage({
		'name': 'ztoolbox_rss-retrieve',
		'data': 'tabLoad'
	})
})();
