import {getPreference} from "../classes/chrome-preferences-2.js";
import {hasFetchPermission} from "../../hasFetchPermission.js";

let freshRssBaseUrl;
const freshRss = {
	get dataURL() {
		return `${freshRssBaseUrl}?a=normal&state=3`;
	},
	/**
	 *
	 * @param {string} websiteState
	 * @return {string}
	 */
	getViewURL(websiteState) {
		return freshRssBaseUrl;
	},
	/**
	 *
	 * @param {string} websiteState
	 * @return {string}
	 */
	getLoginURL(websiteState) {
		return this.dataURL;
	},

	/**
	 *
	 * @param rawHtml
	 * @return {Promise<{response: Response, data: null|Map}>}
	 */
	async getData(rawHtml=null) {
		const output = {
			data: null
		};

		freshRssBaseUrl = await getPreference('freshRss_baseUrl');
		if (!freshRssBaseUrl || !(await hasFetchPermission())) {
			return output;
		}

		let rawData = rawHtml;
		if (rawHtml === null) {
			try {
				output.response = await fetch(this.dataURL);
				rawData = await output.response.text();
			} catch (e) {
				console.error(e);
				return output;
			}
		}

		const jsonVars = /<script id="jsonVars" type="application\/json">[\s\n]*(.*?)[\s\n]*<\/script>/gmi,
			titleReg = /<title>\((\d+)\).*?<\/title>/gmi,
			usernameReg = /<a class="signout" .*?>.*?\((.*?)\)<\/a>/gmi
		;

		const dataJsonVars = jsonVars.exec(rawData),
			dataNbNotifications = titleReg.exec(rawData),
			dataUsername = usernameReg.exec(rawData)
		;



		const result = new Map();
		result.set('count', dataNbNotifications ? parseInt(dataNbNotifications[1]) : 0);
		result.set('logged', !!dataJsonVars);
		result.set('loginId', !!dataUsername ? dataUsername[1] : '');

		result.set("websiteIcon", browser.runtime.getURL('/data/images/freshrss-favicon.svg'));

		output.data = result;
		return output;
	}
};


export default freshRss;
