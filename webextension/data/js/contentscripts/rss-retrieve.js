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

		rssLinks = Array.from(document.querySelectorAll('link[rel="alternate"][type],a[rel="alternate"][type]'));

		rssLinks = rssLinks
			.filter(node => node.type.includes('rss') || node.type.includes('atom'))
			.map(node => {
				return {
					'href': node.href,
					'type': node.type.includes('rss')? 'rss' : 'atom',
					'title': node.tagName.toLowerCase() === 'a'? node.textContent : node.title
				}
			})
		;

		rssLinks = rssLinks.concat(
			Array.from(document.body.querySelectorAll('[href*="/rss/"],[href*="/atom/"],[href*="/feeds/"][href$=".xml"]'))
				.filter(function (node) {
					return node.tagName.toLowerCase() !== 'link' || node.rel !== 'alternate'
				})
				.map(node => ({
					'href': node.href,
					'type': node.href.includes('rss') ? 'rss-link' : 'atom-link',
					'title': (node.textContent.length === 0) ? null : node.textContent.trim()
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
