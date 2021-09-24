(function () {
	const target = document.head.querySelector('title'),
		observer = new MutationObserver(function(mutations) {
			for (const mutation of mutations) {
				sendNewTitle(mutation.target.textContent);
			}
		})
	;
	observer.observe(target, { subtree: true, characterData: true, childList: true });

	let timer = null;
	function sendNewTitle() {
		if (timer) clearTimeout(timer);

		timer = setTimeout(() => {
			const title = document.title,
				countReg = /^\s*\((?<count>\d+)\).*/gi,
				countResult = countReg.exec(title),
				newCount = !!countResult ? parseInt(countResult.groups.count) : 0
			;

			chrome.runtime.sendMessage({
				id: 'freshRss_newTitle',
				data: {
					title,
					newCount
				}
			})

		}, 100);
	}
})()