'use strict';

import('../utils/browserDetect.js')
	.then(module => {
		document.documentElement.classList.toggle('isFirefox', module.isFirefox);
		document.documentElement.classList.toggle('isChrome', module.isChrome);
	})
	.catch(console.error)
;

async function baseInit() {
	const {getPreferences} = await import('../classes/chrome-preferences.js');

	const html = document.documentElement,
		body = document.body
	;
	const preferences = await getPreferences('mode', 'panel_height', 'panel_width', 'check_enabled');
	body.classList.toggle('delegated-version', preferences.get('mode') === 'delegated');
	body.classList.toggle('normal-version', preferences.get('mode') === 'normal');

	const panel_height = (preferences.get('mode') !== 'normal') ? 215 : preferences.get('panel_height'),
		panel_width = (preferences.get('mode') !== 'normal') ? 250 : preferences.get('panel_width')
	;
	html.style.height = panel_height + 'px';
	body.style.width = panel_width + 'px';

	const checkEnabled = document.querySelector('#check_enabled');
	if (checkEnabled) {
		checkEnabled.dataset.translateTitle = `checkEnabled${preferences.get('check_enabled') ? '' : '_off'}`;
		checkEnabled.classList.toggle('off', !preferences.get('check_enabled'));
	}

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
		await import('../panel/tabMover.js');
		await import('../variousFeatures/website-data.js');
		await import('../panel/panel.js');
	})()
		.catch(console.error)
	;
};
