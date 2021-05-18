import {triggerOnCurrentTab, onTabChange} from './browserTabUtils.js';

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
		'id': 'pwa_notification',
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

const _onTabChange = _.debounce(() => {
	updatePwaButton()
		.catch(err => {
			console.error(err);
		})
	;
}, 100, {
	maxWait: 200
});
onTabChange(_onTabChange);
