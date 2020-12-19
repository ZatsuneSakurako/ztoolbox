'use strict';

import { loadPreferences, loadTranslations, savePreference, loadingPromise } from './options-api.js';


const backgroundPage = browser.extension.getBackgroundPage(),
	theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update
;

window.theme_update = function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));
	
	if(typeof panelColorStylesheet === "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
};
theme_update();


async function sendDataToMain(id, data) {
	const backgroundPage = await browser.extension.getBackgroundPage();
	backgroundPage.appGlobal.sendDataToMain("ZToolBox_Options", id,  data);
}
window.sendDataToMain = sendDataToMain;


function init(){
	loadingPromise.then(() => {
		loadPreferences('section#preferences');
		loadTranslations();
	});
}
document.addEventListener('DOMContentLoaded', init);


if (typeof browser.storage.sync === 'object') {
	document.querySelector("#syncContainer").classList.remove("hide");

	document.addEventListener('click', function (e) {
		const input = e.target.closest('input#unTrackUrlParams');
		if (!input) return;

		if (input.checked === false) return;
		browser.runtime.reload();
	});
	document.addEventListener('click', function (e) {
		const input = e.target.closest('#import_preferences');
		if (!input) return;

		if (input.checked === false) return;
		window.importPrefsFromFile.call(input, [e, input]);
	});

	document.addEventListener('click', function (e) {
		const input = e.target.closest('#restaure_sync');
		if (!input) return;

		restaureOptionsFromSync(e)
			.finally(() => {
				if (getPreference('unTrackUrlParams') === true) {
					_webRequestPermissions(e)
						.catch(console.error)
					;
				}
			})
		;
	});

	document.addEventListener('click', function (e) {
		const input = e.target.closest('#save_sync');
		if (!input) return;

		saveOptionsInSync(e)
			.catch(console.error)
		;
	});
}


/*const ps = new PerfectScrollbar("#contentContainer", {
	includePadding: true,
	suppressScrollX: true
});
window.onresize = function(){
	ps.update();
};*/