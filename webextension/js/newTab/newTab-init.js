import {theme_update} from "../classes/backgroundTheme.js";

async function init() {
	import('./newTab.js')
		.catch(console.error)
	;
	document.querySelector('#newTab-script')?.remove();
	theme_update()
		.catch(console.error);
}
init()
	.catch(console.error)
;
