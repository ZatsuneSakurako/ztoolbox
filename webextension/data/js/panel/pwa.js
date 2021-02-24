
/**
 * @param {string} name
 */
async function triggerOnCurrentTab(name) {
	const win = await browser.windows.getCurrent({
		'populate': true,
		'windowTypes': ['normal']
	});
	const [activeTab] = win.tabs.filter(tab => {
		return tab.hasOwnProperty('active') && tab.active === true;
	});

	if (!activeTab) {
		return;
	}

	const tabPort = browser.tabs.connect(activeTab.id, {
		'name': name
	});
	const promise = new Promise((resolve, reject) => {
		tabPort.onMessage.addListener(result => {
			try {
				resolve(JSON.parse(result));
				return;
			} catch (e) {
				console.dir(e)
			}
			resolve(result);
		});

		tabPort.onDisconnect.addListener(reject);
	});

	return {
		tabPort,
		result: await promise
	};
}

async function onPwaClick() {
	const backgroundPage = await browser.runtime.getBackgroundPage(),
		{result} = await triggerOnCurrentTab('ztoolbox_trigger-pwa').catch(console.error)
	;
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
}

document.addEventListener('click', e => {
	const elm = e.target.closest('#pwa');
	if (!elm) return;

	onPwaClick()
		.catch(console.error)
	;
});



/**
 *
 * @type {browser.runtime.Port|null}
 */
let currTabPort = null;
async function updatePwaButton() {
	if (currTabPort !== null) {
		currTabPort.disconnect();
		currTabPort = null;
	}

	const button = document.querySelector('button#pwa');
	const backgroundPage = await browser.runtime.getBackgroundPage();
	const triggerResult = await triggerOnCurrentTab('ztoolbox_detect-pwa')
		.catch(console.error)
	;
	const title = backgroundPage.zDK.customTitleForConsole('PWA');
	if (!triggerResult) {
		console.log(title[0], title[1], JSON.stringify(triggerResult));
		button.classList.toggle('hide', true);
		return;
	}

	const {result, tabPort} = triggerResult;
	currTabPort = tabPort;
	console.log(title[0], title[1], result);

	button.classList.toggle('hide', !result);
	tabPort.onMessage = (data) => {
		button.classList.toggle('hide', !data);
	};
}

const onTabChange = _.debounce(() => {
	updatePwaButton()
		.catch(err => {
			console.error(err);
		})
	;
}, 100, {
	maxWait: 200
});
browser.windows.onFocusChanged.addListener(onTabChange);
browser.tabs.onActivated.addListener(onTabChange);
onTabChange();