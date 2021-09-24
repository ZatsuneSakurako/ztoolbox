import {throttle} from "../lib/throttle.js";

const freshRss = {
	get dataURL() {
		return `${getPreference('freshRss_baseUrl')}?a=normal&state=3`;
	},
	/**
	 *
	 * @param {string} websiteState
	 * @return {string}
	 */
	getViewURL(websiteState) {
		return getPreference('freshRss_baseUrl');
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

		if (!getPreference('freshRss_baseUrl')) {
			return output;
		}

		let rawData = rawHtml;
		if (rawHtml === null) {
			try {
				output.response = await fetch(this.dataURL);
				rawData = await output.response.text();
			} catch (e) {
				console.error(e);
				return outut;
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
		result.set('count', dataNbNotifications ? dataNbNotifications[1] : 0);
		result.set('logged', !!dataJsonVars);
		result.set('loginId', !!dataUsername ? dataUsername[1] : '');

		result.set("websiteIcon", browser.runtime.getURL('/data/images/freshrss-favicon.svg'));

		output.data = result;
		return output;
	}
};


/**
 *
 * @type {DebouncedFunc<function(): void>}
 */
const debounced = throttle(function () {
	setTimeout(() => {
		updateRegistration()
			.catch(console.error)
		;
	})
}, 500);

browser.storage.onChanged.addListener((changes, area) => {
	if (area === "local" && 'freshRss_baseUrl' in changes) {
		debounced();
	}
});

/**
 *
 * @type {RegisteredContentScript|null}
 */
let contentScriptRegistration = null;
window.baseRequiredPromise.then(async function() {
	debounced();
});

async function updateRegistration() {
	if (!getPreference('freshRss_baseUrl')) {
		if (!!contentScriptRegistration) {
			contentScriptRegistration.unregister();
			contentScriptRegistration = null;
		}
		return;
	}

	if (!contentScriptRegistration) {
		contentScriptRegistration = await browser.contentScripts.register({
			"js": [
				{
					file: "/data/js/contentscripts/freshRss.js"
				}
			],
			"matches": [ '<all_urls>' ],
			"includeGlobs": [
				getPreference('freshRss_baseUrl') + "*"
			],
			"runAt": "document_start",
			allFrames: true
		});
	}
}



export default freshRss;
