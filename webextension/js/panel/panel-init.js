'use strict';

import * as browserDetect from '../utils/browserDetect.js';
import {getBackgroundNativeIsConnected} from "../classes/chrome-preferences.js";
import {theme_update, THEME_LS_PREF_CACHE_KEY} from "../classes/backgroundTheme.js";



document.documentElement.classList.toggle('isFirefox', browserDetect.isFirefox);
document.documentElement.classList.toggle('isChrome', browserDetect.isChrome);
if (browserDetect.isFirefox) {
	import("./requestPermission.js")
		.catch(console.error);
}



import("./tabUserStyles.js")
	.catch(console.error);



async function baseInit() {
	const chromeNativeConnected = await getBackgroundNativeIsConnected()
		.catch(console.error);
	document.body.classList.toggle('delegated-version', !!chromeNativeConnected);

	/**
	 *
	 * @type {HTMLAnchorElement}
	 */
	const $settings = document.querySelector('a#settings');
	if ($settings) {
		$settings.classList.toggle('hide', !chromeNativeConnected);
	}
}


theme_update()
	.catch(console.error);


window.onload = function () {
	window.onload = null;

	// TODO Remove later
	for (const key of Object.keys(self.localStorage)) {
		if (key === THEME_LS_PREF_CACHE_KEY) continue;
		self.localStorage.removeItem(key);
	}

	(async () => {
		import('../panel/panel.js')
			.catch(console.error);
		baseInit()
			.catch(console.error);
	})()
		.catch(console.error)
	;
};
