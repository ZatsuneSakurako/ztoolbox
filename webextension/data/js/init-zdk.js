import {ZDK} from "./classes/ZDK.js";

// appGlobal: Accessible with browser.extension.getBackgroundPage();
window.appGlobal = {};

const zDK = new ZDK();
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
