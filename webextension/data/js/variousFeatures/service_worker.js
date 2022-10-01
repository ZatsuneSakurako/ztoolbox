import {deletePreferences} from "../classes/chrome-preferences-2.js";
import {i18ex} from "../translation-api.js";

// TODO Delete

async function updateRegistration() {
	await i18ex.loadingPromise;

	let hasPreference = false;
	try {
		const val = await browser.storage.local.get('serviceWorkerWhitelist');
		hasPreference = 'serviceWorkerWhitelist' in val;
	} catch (e) {
		console.error(e);
	}
	if (!!hasPreference) {
		await deletePreferences('serviceWorkerWhitelist');
	}
}

chrome.runtime.onStartup.addListener(function () {
	updateRegistration()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	updateRegistration()
		.catch(console.error)
	;
});
