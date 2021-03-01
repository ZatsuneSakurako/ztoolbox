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
	let jsFiles = [
		'../options-api.js',
		'../lib/lodash.custom.min.js',
		'../copyToClipboard.js',
		'../panel/tabMover.js',
		'../panel/pwa.js',
		'../panel/panel.js'
	];
	if(typeof browser === 'undefined' || browser === null) {
		jsFiles.unshift('../lib/browser-polyfill.js');
	}

	(async () => {
		for (let src of jsFiles) {
			await import(src);
		}
	})();
};
