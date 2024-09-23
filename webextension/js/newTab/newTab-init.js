import {theme_cache_update} from "../classes/backgroundTheme.js";

async function init() {
	import('./newTab.js')
		.catch(console.error)
	;
	document.querySelector('#newTab-script')?.remove();


	window.optionColorStylesheet = await theme_cache_update(document.querySelector('#generated-color-stylesheet'));
	if (typeof optionColorStylesheet === 'object' && optionColorStylesheet !== null) {
		console.info("Theme update");

		let currentThemeNode = document.querySelector('#generated-color-stylesheet');
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.body.dataset.theme = optionColorStylesheet.dataset.theme;

		document.head.appendChild(optionColorStylesheet);
	}
}
init()
	.catch(console.error)
;
