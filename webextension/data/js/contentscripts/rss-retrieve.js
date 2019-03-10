(function () {
	let rssLinks;



	const clearRssLinks = function () {
		rssLinks = undefined;
	};
	window.addEventListener('popstate', clearRssLinks, true);
	window.addEventListener("hashchange", clearRssLinks, true);





	// Force creation of a new string
	let currentHref = `${window.location.href}`;
	const detectRssFeeds = function() {
		currentHref = `${window.location.href}`;

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

		rssLinks = rssLinks.concat(
			Array.from(document.body.querySelectorAll('[href*="/rss/"],[href*="/atom/"]'))
				.filter(function (node) {
					return node.tagName !== 'link' || link.rel !== 'alternate'
				})
				.map(node => ({
					'href': node.href,
					'type': node.href.includes('rss') ? 'rss-link' : 'atom-link',
					'title': (node.textContent.length === 0) ? null : node.textContent
				}))
		);

		const uniqueHref = [];
		rssLinks = rssLinks.filter(item => {
			if (uniqueHref.indexOf(item.href) === -1) {
				uniqueHref.push(item.href);
				return true;
			}

			return false;
		})
	};



	const onConnect = function (port) {
		if (port.sender.id === chrome.runtime.id && port.name === 'ztoolbox_rss-retrieve') {
			if (rssLinks === undefined || currentHref !== window.location.href) {
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
