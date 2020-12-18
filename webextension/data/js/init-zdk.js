import {ZDK} from "./classes/ZDK.js";
import {setBaseDir} from './classes/loadJS.js';

// appGlobal: Accessible with browser.extension.getBackgroundPage();
window.appGlobal = {};

const ADDON_JS_ROOT = window.ADDON_JS_ROOT = '/data/js';
setBaseDir(ADDON_JS_ROOT);

const zDK = new ZDK(ADDON_JS_ROOT);
const backgroundPage = browser.extension.getBackgroundPage();
if (backgroundPage !== null) {
	backgroundPage.zDK = zDK;
	/**
	 * @global
	 * @type {ZDK}
	 */
	backgroundPage.ZDK = ZDK;
}
window.openTabIfNotExist = ZDK.openTabIfNotExist;
