import {triggerOnCurrentTab, onTabChange} from './browserTabUtils.js';
import {throttle} from "../../lib/throttle.js";

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

const _onTabChange = throttle(() => {
	updateServiceWorker()
		.catch(err => {
			console.error(err);
		})
	;
}, 100);
onTabChange(_onTabChange);
