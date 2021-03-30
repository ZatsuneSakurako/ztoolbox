/**
 *
 * @return {boolean}
 */
function enableFeature() {
	const whitelist = getPreference('serviceWorkerWhitelist');
	if (typeof whitelist !== 'object' || whitelist === null || whitelist['*'] === 'whitelist') {
		return false;
	}
	return [...Object.keys(whitelist)].length > 0;
}

async function updateRegistration() {
	if (!enableFeature()) {
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
const debounced = _.debounce(function () {
	updateRegistration()
		.catch(console.error)
	;
}, 500);
browser.storage.local.onChanged.addListener(function onChanged(changes) {
	if (!changes.serviceWorkerWhitelist) return;

	debounced(changes);
})

/**
 *
 * @type {RegisteredContentScript|null}
 */
let contentScriptRegistration = null;
window.baseRequiredPromise.then(async function() {
	debounced();
});
