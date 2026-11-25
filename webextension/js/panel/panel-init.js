'use strict';

import * as browserDetect from '../utils/browserDetect.js';
import {theme_update, THEME_LS_PREF_CACHE_KEY} from "../classes/backgroundTheme.js";


document.documentElement.classList.toggle('isFirefox', browserDetect.isFirefox);
document.documentElement.classList.toggle('isChrome', browserDetect.isChrome);


import("./tabUserStyles.js")
	.catch(console.error);


theme_update()
	.catch(console.error);


window.onload = function () {
	window.onload = null;

	// TODO Remove later
	for (const key of Object.keys(self.localStorage)) {
		if (key === THEME_LS_PREF_CACHE_KEY) continue;
		self.localStorage.removeItem(key);
	}

	import('../panel/panel.js')
		.catch(console.error);
};
