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
	await browser.scripting.unregisterContentScripts(['service_worker']);
	if (!!await enableFeature()) {
		await browser.scripting.registerContentScripts([
			{
				"id": "service_worker",
				"js": [
					"/data/js/contentscripts/service_worker.js"
				],
				"matches": [ "<all_urls>" ],
				"runAt": "document_start",
				allFrames: false
			}
		]);
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

i18ex.loadingPromise.then(async function() {
	debounced();
});
