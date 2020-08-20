'use strict';

import { loadPreferences, loadTranslations, savePreference } from './options-api.js';


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

loadPreferences('section#preferences');

function init(){
	loadTranslations();
}
document.addEventListener('DOMContentLoaded',		init);

if (typeof browser.storage.sync === 'object') {
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", async function (event) {
		await restaureOptionsFromSync(event);
	});	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function (event) {
		saveOptionsInSync(event);
	});
}


/*const ps = new PerfectScrollbar("#contentContainer", {
	includePadding: true,
	suppressScrollX: true
});
window.onresize = function(){
	ps.update();
};*/