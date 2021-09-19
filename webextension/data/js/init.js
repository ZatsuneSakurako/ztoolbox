import './options-data.js';
import {loadingPromise} from './options-api.js';

window.baseRequiredPromise = new Promise(async resolve => {
	await loadingPromise;
	await browser.contextMenus.removeAll();
	setTimeout(resolve, 50);
});
