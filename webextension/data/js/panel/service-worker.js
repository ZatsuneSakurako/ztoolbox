import {triggerOnCurrentTab, onTabChange} from './browserTabUtils.js';

/**
 *
 * @type {browser.runtime.Port|null}
 */
let currTabPort = null;
async function updateServiceWorker() {
	if (currTabPort !== null) {
		currTabPort.disconnect();
		currTabPort = null;
	}

	const triggerResult = await triggerOnCurrentTab('ztoolbox_service-worker')
		.catch(console.error)
	;

	if (!triggerResult) {
		return;
	}

	console.dir(triggerResult)
}

const _onTabChange = _.debounce(() => {
	updateServiceWorker()
		.catch(err => {
			console.error(err);
		})
	;
}, 100, {
	maxWait: 200
});
onTabChange(_onTabChange);
