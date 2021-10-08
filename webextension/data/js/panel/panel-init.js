'use strict';

import('../browserDetect.js')
	.then(module => {
		document.documentElement.classList.toggle('isFirefox', module.isFirefox);
		document.documentElement.classList.toggle('isChrome', module.isChrome);
	})
	.catch(console.error)
;

async function baseInit() {
	if (typeof browser === 'undefined' || browser === null) {
		await import('../lib/browser-polyfill.js');
	}

	const {getPreference} = await import('../classes/chrome-preferences-2.js');

	const html = document.querySelector('html'),
		body = document.querySelector('body')
	;
	html.style.height = await getPreference('panel_height');
	body.style.width = await getPreference('panel_width');

	const {loadTranslations} = await import('../translation-api.js');
	await loadTranslations;
}
const baseInitPromise = baseInit();
baseInitPromise.then(async () => {
	const {theme_cache_update} = await import('../backgroundTheme.js');
	window.optionColorStylesheet = await theme_cache_update(document.querySelector('#generated-color-stylesheet'));
	if (typeof optionColorStylesheet === 'object' && optionColorStylesheet !== null) {
		console.info("Theme update");

		let currentThemeNode = document.querySelector('#generated-color-stylesheet');
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.querySelector('body').dataset.theme = optionColorStylesheet.dataset.theme;

		document.querySelector('head').appendChild(optionColorStylesheet);
	}
});

window.onload = function () {
	window.onload = null;


	const currentCat = window.localStorage.getItem('panel-current-cat');
	if (currentCat !== null) {
		/**
		 *
		 * @type {HTMLInputElement}
		 */
		const input = document.querySelector(`input#${currentCat}`);
		input.checked = true;
	}
	document.addEventListener('change', function (e) {
		const node = e.target.closest('input[type="radio"][name="sections"]');
		if (!node) return;

		window.localStorage.setItem('panel-current-cat', node.id);
	});

	(async () => {
		await baseInitPromise;

		const jsFiles = [
			'../lib/throttle.js',
			'../panel/browserTabUtils.js',
			'../panel/tabMover.js',
			'../panel/service-worker.js',
			'../variousFeatures/website-data.js',
			'../panel/freshrss.js',
			'../panel/panel.js'
		];

		for (let src of jsFiles) {
			await import(src);
		}
	})();
};
