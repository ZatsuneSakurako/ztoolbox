'use strict';

import {loadTranslations} from './translation-api.js';
import {loadPreferences, loadingPromise, importPrefsFromFile} from './options-api.js';
import {theme_cache_update} from "./backgroundTheme.js";



window.theme_update = async function theme_update(){
	let panelColorStylesheet = await theme_cache_update(document.querySelector("#generated-color-stylesheet"));

	if(typeof panelColorStylesheet === "object" && panelColorStylesheet !== null){
		console.info("Theme update");

		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.querySelector("head").appendChild(panelColorStylesheet);
	}
};


async function sendDataToMain(id, data) {
	browser.runtime.sendMessage({
		id,
		data: data ?? null
	})
		.catch(console.error)
	;
}
window.sendDataToMain = sendDataToMain;


import('./browserDetect.js')
	.then(module => {
		const $html = document.documentElement;
		$html.classList.toggle('isFirefox', module.isFirefox);
		$html.classList.toggle('isChrome', module.isChrome);
	})
;

function init(){
	loadingPromise.then(async () => {
		await loadTranslations();
		loadPreferences('section#preferences');
		theme_update();
	});
}
document.addEventListener('DOMContentLoaded', init);



if (typeof browser.storage.sync === 'object') {
	document.querySelector("#syncContainer").classList.remove("hide");

	document.addEventListener('click', function (e) {
		const input = e.target.closest('#import_preferences');
		if (!input) return;

		if (input.checked === false) return;
		importPrefsFromFile.call(input, [e, input]);
	});

	document.addEventListener('click', function (e) {
		const input = e.target.closest('#restaure_sync');
		if (!input) return;

		restaureOptionsFromSync(e);
	});

	document.addEventListener('click', function (e) {
		const input = e.target.closest('#save_sync');
		if (!input) return;

		saveOptionsInSync(e)
			.catch(console.error)
		;
	});
}
