import {theme_update} from "../classes/backgroundTheme.js";
import {loadTranslations} from '../translation-api.js';

async function init() {
	import('./newTab.js')
		.catch(console.error)
	;
	document.querySelector('#newTab-script')?.remove();
	theme_update()
		.catch(console.error);
	loadTranslations()
		.catch(console.error);
}
init()
	.catch(console.error)
;
