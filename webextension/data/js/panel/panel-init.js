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
	let jsFiles = [];
	if(typeof browser === 'undefined' || browser === null) {
		jsFiles.push('/lib/browser-polyfill.js');
	}
	jsFiles = jsFiles.concat(['options-api.js', 'lib/lodash.custom.min.js', 'copyToClipboard.js', 'panel/panel.js']);

	import('../classes/loadJS.js')
		.then(({loadJS}) => {
			loadJS(document, jsFiles);
		})
	;
};
