'use strict';

import('../utils/browserDetect.js')
	.then(module => {
		document.documentElement.classList.toggle('isFirefox', module.isFirefox);
		document.documentElement.classList.toggle('isChrome', module.isChrome);
	})
	.catch(console.error)
;

self.sendToMain = function sendToMain(id, ...args) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(chrome.runtime.id, {
			id,
			data: [...args]
		}, function (result) {
			if (result.isError) {
				reject();
			} else {
				resolve(result.response);
			}
		});
	});
}

async function baseInit() {
	const {getSessionNativeIsConnected} = await import('../classes/chrome-native-settings.js');

	const chromeNativeConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	document.body.classList.toggle('delegated-version', chromeNativeConnected);
	document.body.classList.toggle('normal-version', !chromeNativeConnected);

	/**
	 *
	 * @type {HTMLButtonElement}
	 */
	const $settings = document.querySelector('button#settings');
	if ($settings) {
		$settings.disabled = !chromeNativeConnected;
		$settings.classList.remove('hide');
	}

	const {loadTranslations} = await import('../translation-api.js');
	await loadTranslations;


	if (!chromeNativeConnected) {
		const {loadPreferencesNodes} = await import("../classes/chrome-preferences-ui.js"),
			{theme_update} = await import("../classes/backgroundTheme.js")
		;
		loadPreferencesNodes()
			.then(() => {
				theme_update()
					.catch(console.error)
				;
			})
			.catch(console.error)
		;
	}
}
const baseInitPromise = baseInit();
baseInitPromise.then(async () => {
	const {theme_cache_update} = await import('../classes/backgroundTheme.js');
	window.optionColorStylesheet = await theme_cache_update(document.querySelector('#generated-color-stylesheet'));
	if (typeof optionColorStylesheet === 'object' && optionColorStylesheet !== null) {
		console.info("Theme update");

		let currentThemeNode = document.querySelector('#generated-color-stylesheet');
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.body.dataset.theme = optionColorStylesheet.dataset.theme;

		document.head.appendChild(optionColorStylesheet);
	}
});

window.onload = function () {
	window.onload = null;

	// TODO Remove later
	window.localStorage.clear();

	(async () => {
		await baseInitPromise;

		await import('../../lib/throttle.js');
		await import('../panel/tabMover.js');
		await import('../panel/panel.js');
	})()
		.catch(console.error)
	;
};
