'use strict';

import {loadTranslations} from './translation-api.js';
import {theme_update} from "./classes/backgroundTheme.js";
import {loadPreferencesNodes} from "./classes/chrome-preferences-ui.js";



import('./utils/browserDetect.js')
	.then(module => {
		const $html = document.documentElement;
		$html.classList.toggle('isFirefox', module.isFirefox);
		$html.classList.toggle('isChrome', module.isChrome);
	})
;



async function init() {
	await loadTranslations();
	loadPreferencesNodes(document.querySelector('section#preferences'))
		.then(() => {
			theme_update()
				.catch(console.error)
			;
		})
		.catch(console.error)
	;
}
document.addEventListener('DOMContentLoaded', init);
