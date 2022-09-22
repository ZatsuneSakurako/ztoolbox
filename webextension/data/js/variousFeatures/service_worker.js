/**
 *
 * @return {boolean}
 */
import {throttle} from "../lib/throttle.js";
import {getPreference} from "../classes/chrome-preferences-2.js";
import {i18ex} from "../translation-api.js";

async function enableFeature() {
	const whitelist = await getPreference('serviceWorkerWhitelist');
	if (typeof whitelist !== 'object' || whitelist === null) {
		return false;
	}
	const nbKeys = [...Object.keys(whitelist)].length;
	return nbKeys > 0 && !(nbKeys === 1 && whitelist['*'] === 'whitelist');
}

async function updateRegistration() {
	if (!await enableFeature()) {
		if (!!contentScriptRegistration) {
			contentScriptRegistration.unregister();
			contentScriptRegistration = null;
		}
		return;
	}

	if (!contentScriptRegistration) {
		contentScriptRegistration = await browser.contentScripts.register({
			"js": [
				{
					file: "/data/js/contentscripts/service_worker.js"
				}
			],
			"matches": [ "<all_urls>" ],
			"runAt": "document_start",
			allFrames: false
		});
	}
}

/**
 *
 * @type {DebouncedFunc<function(): void>}
 */
const debounced = throttle(function () {
	updateRegistration()
		.catch(console.error)
	;
}, 500);

browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;
	if (!changes.serviceWorkerWhitelist) return;

	debounced(changes);
});

/**
 *
 * @type {RegisteredContentScript|null}
 */
let contentScriptRegistration = null;
i18ex.loadingPromise.then(async function() {
	debounced();
});
