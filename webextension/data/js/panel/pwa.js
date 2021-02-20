async function onPwaClick() {
	const [activeTab] = await browser.tabs.query({
		active: true,
		currentWindow: true
	})

	if (!activeTab) {
		return;
	}

	const backgroundPage = await browser.runtime.getBackgroundPage(),
		tabPort = browser.tabs.connect(activeTab.id, {
			'name': 'ztoolbox_trigger-pwa'
		})
	;
	tabPort.onMessage.addListener(result => {
		console.dir(result);

		let resultStr = result;
		if (!!result && typeof result === 'object') {
			if (result.outcome) {
				resultStr = result.outcome;
			} else {
				resultStr = JSON.stringify(result)
			}
		}

		backgroundPage.doNotif({
			"message": `PWA : ${resultStr}`
		});
	});
}

document.addEventListener('click', e => {
	const elm = e.target.closest('#pwa');
	if (!elm) return;

	onPwaClick()
		.catch(console.error)
	;
});