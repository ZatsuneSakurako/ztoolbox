'use strict';

let backgroundPage = null;

const applyPanelSize = () => {
	const html = document.querySelector('html'),
		body = document.querySelector('body');
	html.style.height = backgroundPage.getPreference('panel_height');

	const panelWidth = backgroundPage.getPreference('panel_width');
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

chrome.runtime.getBackgroundPage(_backgroundPage => {
	backgroundPage = _backgroundPage;

	backgroundPage.baseRequiredPromise.then(() => {
		applyPanelSize();

		window.optionColorStylesheet = backgroundPage.backgroundTheme.theme_cache_update(document.querySelector('#generated-color-stylesheet'));
		if (typeof optionColorStylesheet === 'object' && optionColorStylesheet !== null) {
			console.info("Theme update");

			let currentThemeNode = document.querySelector('#generated-color-stylesheet');
			currentThemeNode.parentNode.removeChild(currentThemeNode);

			document.querySelector('body').dataset.theme = optionColorStylesheet.dataset.theme;

			document.querySelector('head').appendChild(optionColorStylesheet);
		}

		document.querySelector('#disableNotifications').classList.toggle('off', backgroundPage.appGlobal['notificationGlobalyDisabled']);
		document.querySelector('#disableNotifications').dataset.translateTitle = (backgroundPage.appGlobal['notificationGlobalyDisabled'])? 'GloballyDisabledNotifications' : 'GloballyDisableNotifications';
	});
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
		if(typeof browser === 'undefined' || browser === null) {
			import('../lib/browser-polyfill.js');
		}


		let jsFiles = [
			'../options-api.js',
			'../lib/lodash.custom.min.js',
			'../copyToClipboard.js',
			'../panel/tabMover.js',
			'../panel/pwa.js',
			'../panel/panel.js'
		];


		for (let src of jsFiles) {
			await import(src);
		}
	})();
};
