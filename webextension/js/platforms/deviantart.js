import {hasFetchPermission} from "../utils/hasFetchPermission.js";
import JSON5 from '../../lib/json5.js';

const deviantArt = {
	// Old data url dataURL:"http://www.deviantart.com/notifications/watch",
	dataURL: 'https://www.deviantart.com/watch/deviations',
	defaultFavicon: 'https://www.deviantart.com/favicon.ico',
	// defaultFavicon: 'https://icons.duckduckgo.com/ip2/www.deviantart.com.ico',
	getViewURL: function(websiteState) {
		if (websiteState.count > 0) {
			return this.dataURL;
		} else if (websiteState.logged !== null && websiteState.logged && websiteState.loginId !== "") {
			return `http://www.deviantart.com/${websiteState.loginId}`;
		} else if (websiteState.logged !== null && websiteState.logged === false) {
			return this.getLoginURL(websiteState); // dA will redirect it to https://www.deviantart.com/users/login?ref=*
		} else {
			return "http://www.deviantart.com/";
		}
	},
	getLoginURL: function(websiteState) {
		return "https://www.deviantart.com/watch/deviations"; // dA will redirect it to https://www.deviantart.com/users/login?ref=*
	},

	/**
	 *
	 * @param rawHtml
	 * @return {Promise<{response: Response, data: null|Map}>}
	 */
	getData: async function (rawHtml=null) {
		const output = {
			data: null
		};

		if (!(await hasFetchPermission())) {
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





		const reg = /window.__INITIAL_STATE__\s*=\s*JSON.parse\(["'](.*)["']\)/ig;

		const rawInitialData = rawData.match(reg);
		let result;

		if (Array.isArray(rawInitialData) === false || rawInitialData.length <= 0) {
			return output;
		}

		let initialData = reg.exec(rawInitialData[0]);
		if (Array.isArray(initialData) === false || initialData.length !== 2) {
			return output;
		}

		try {
			/*
			 * Double JSON.parse
			 * 1st to unescape \" ....
			 * 2nd to get the object
			 */
			initialData = JSON5.parse(JSON5.parse(`"${initialData[1]}"`));
		} catch (e) {
			console.error(e);
			return output;
		}
		console.dir(initialData)

		if (initialData.hasOwnProperty('@@publicSession') === false) {
			return output;
		}

		const data = initialData['@@publicSession'];
		if (data.hasOwnProperty('isLoggedIn') === false || data.hasOwnProperty('user') === false || data.hasOwnProperty('counts') === false) {
			console.error('Missing data in @@publicSession');
			return output;
		}

		result = new Map();
		result.set('count', 0);
		let count = 0;
		result.set('logged', data.isLoggedIn);
		result.set('loginId', data.user.username);
		result.set('folders', new Map());

		result.set("websiteIcon", this.defaultFavicon);



		if (initialData.hasOwnProperty('@@streams') === false) {
			for (let folderName in data.counts) {
				if (data.counts.hasOwnProperty(folderName)) {
					const folderCount = data.counts[folderName];
					if (Number.isNaN(folderCount)) {
						continue;
					}

					if (['points', 'cart'].includes(folderName)) {
						continue;
					}

					count += folderCount;
					result.get('folders').set(folderName, {
						'folderCount': folderCount,
						'folderName': folderName
					});
				}
			}
		} else {
			console.debug('@@streams', initialData['@@streams']);
			const streams = initialData['@@streams'];
			for (let [name, item] of Object.entries(streams)) {
				if (['NETWORKBAR_RECOMMENDED_GROUPS', 'NETWORKBAR_WATCHED_GROUPS'].includes(name.toUpperCase())) continue;

				const folderCount = item.items.length,
					folderName = item?.streamParams?.notificationType ?? item?.streamParams?.requestEndpoint
				;
				console.info(folderName, folderCount);

				count += folderCount;
				result.get('folders').set(folderName, {
					'folderCount': folderCount,
					'folderName': folderName
				});
			}
		}

		result.set('count', count);
		output.data = result;
		return output;
	}
};

export default deviantArt;
