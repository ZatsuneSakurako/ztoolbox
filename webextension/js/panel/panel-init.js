'use strict';

import('../utils/browserDetect.js')
	.then(module => {
		document.documentElement.classList.toggle('isFirefox', module.isFirefox);
		document.documentElement.classList.toggle('isChrome', module.isChrome);
	})
	.catch(console.error)
;

async function baseInit() {
	if (typeof browser === 'undefined' || browser === null) {
		await import('../../lib/browser-polyfill.js');
	}

	const {getPreferences} = await import('../classes/chrome-preferences.js');

	const html = document.documentElement,
		body = document.body
	;
	const preferences = await getPreferences('mode', 'panel_height', 'panel_width');
	body.classList.toggle('simple-version', preferences.get('mode') === 'simplified');
	html.style.height = preferences.get('panel_height') + 'px';
	body.style.width = preferences.get('panel_width') + 'px';

	const {loadTranslations} = await import('../translation-api.js');
	await loadTranslations;
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
		await import('../panel/browserTabUtils.js');
		await import('../panel/tabMover.js');
		await import('../panel/service-worker.js');
		await import('../variousFeatures/website-data.js');
		await import('../panel/panel.js');
	})()
		.catch(console.error)
	;
};
