import './options-data.js';
import {chromeSettings, i18ex} from './options-api.js';

window.appGlobal = {};

const baseRequiredPromise = Promise.allSettled([chromeSettings.loadingPromise, i18ex.loadingPromise]);
window.baseRequiredPromise = new Promise(async resolve => {
	await baseRequiredPromise;
	await browser.contextMenus.removeAll();
	setTimeout(resolve, 50);
});
