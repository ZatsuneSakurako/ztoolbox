import deviantArt from "../platforms/deviantart.js";
import freshRss from "../platforms/freshrss.js";
import {WebsiteData} from "./website-data.js";
import {getPreference} from "../classes/chrome-preferences.js";

export const dataStorageArea = browser.storage.session ?? browser.storage.local,
	refreshDataStorageBase = `_websitesDataStore`
;

/**
 *
 * @return {Promise<{deviantArt: deviantArt, freshRss: freshRss}>}
 */
export async function getWebsitesApis() {
	const websites = {};
	websites['deviantArt'] = deviantArt;
	if (!!await getPreference('freshRss_baseUrl')) {
		websites['freshRss'] = freshRss;
	} else if (websitesData.has('freshRss')) {
		websitesData.delete('freshRss');
	}
	return websites;
}

/**
 *
 * @type {Map<string, WebsiteData>}
 */
export const websitesData = new Map();
export async function loadStoredWebsitesData() {
	websitesData.clear();

	let raw = (await dataStorageArea.get([refreshDataStorageBase])) ?? {};
	raw = raw[refreshDataStorageBase] ?? {};

	const deviantArtData = !!raw.deviantArt ? WebsiteData.fromJSON(raw.deviantArt) : new WebsiteData();
	websitesData.set('deviantArt', deviantArtData);
	if (!deviantArtData.websiteIcon) {
		deviantArtData.websiteIcon = deviantArt.defaultFavicon;
	}
	if (!deviantArtData.href) {
		deviantArtData.href = deviantArt.getLoginURL();
	}

	const freshRss_baseUrl = await getPreference('freshRss_baseUrl');
	if (!!freshRss_baseUrl) {
		const freshRssData = !!raw.freshRss ? WebsiteData.fromJSON(raw.freshRss) : new WebsiteData();
		websitesData.set('freshRss', freshRssData);
		if (!freshRssData.websiteIcon) {
			freshRssData.websiteIcon = freshRss.defaultFavicon;
		}
		if (!freshRssData.href) {
			freshRssData.href = freshRss_baseUrl;
		}
	} else if (!!raw.freshRss) { // If no value in 'freshRss_baseUrl' but raw.freshRss data present
		delete raw.freshRss;
	}

	return websitesData;
}