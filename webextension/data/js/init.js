import './options-data.js';
import {chromeSettings} from './options-api.js';

const baseRequiredPromise = Promise.allSettled([chromeSettings.loadingPromise, i18ex.loadingPromise]);
window.baseRequiredPromise = new Promise(async resolve => {
	await baseRequiredPromise;
	await browser.contextMenus.removeAll();
	setTimeout(resolve, 50);
});
