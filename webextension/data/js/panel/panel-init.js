'use strict';

const applyPanelSize = () => {
	const html = document.querySelector('html'),
		body = document.querySelector('body');
	html.style.height = getPreference('panel_height');

	const panelWidth = getPreference('panel_width');
	body.style.width = panelWidth;
	document.documentElement.style.setProperty('--opentip-maxwidth', `${((panelWidth/2<300)? (panelWidth/2) : panelWidth)}px`);
};

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

	await import('../classes/chrome-preferences.js');
	const {getPreference, savePreference, loadingPromise} = await import('../options-api.js');
	window.getPreference = getPreference;
	window.savePreference = savePreference;
	await loadingPromise;
}
const baseInitPromise = baseInit();
baseInitPromise.then(async () => {
	applyPanelSize();

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

		let jsFiles = [
			'../lib/throttle.js',
			'../copyToClipboard.js',
			'../panel/browserTabUtils.js',
			'../panel/tabMover.js',
			'../panel/pwa.js',
			'../panel/service-worker.js',
			'../panel/freshrss.js',
			'../panel/panel.js'
		];


		for (let src of jsFiles) {
			await import(src);
		}
	})();
};
