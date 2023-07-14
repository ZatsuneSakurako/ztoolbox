import deviantArt from "../platforms/deviantart.js";
import freshRss from "../platforms/freshrss.js";
import {WebsiteData} from "./website-data.js";
import {getPreference} from "../classes/chrome-preferences.js";

/**
 *
 * @return {Promise<{deviantArt: deviantArt, freshRss: freshRss}>}
 */
export async function getWebsitesApis() {
	const websites = {};
	websites['deviantArt'] = deviantArt;
	if (!!await getPreference('freshRss_baseUrl')) {
		websites['freshRss'] = freshRss;
	}
	return websites;
}

export async function loadStoredWebsitesData() {
	/**
	 *
	 * @type {Map<string, WebsiteData>}
	 */
	const websitesData = new Map();

	const deviantArtData = new WebsiteData(deviantArt);
	websitesData.set('deviantArt', deviantArtData);

	const freshRss_baseUrl = await getPreference('freshRss_baseUrl');
	if (!!freshRss_baseUrl) {
		const freshRssData = new WebsiteData(freshRss);
		websitesData.set('freshRss', freshRssData);
	}

	return websitesData;
}