const _userStylesStoreKey = '_userStyles';

/**
 *
 * @typedef {object} UserStyle
 * @property { {domain: string, regex?: RegExp, startWith?: string, endWith?: string} } url
 * @property {string[]} tags
 * @property {boolean} [allFrames]
 * @property {boolean} [asUserStyle]
 * @property {string} css
 */
/**
 *
 * @returns {Promise<UserStyle[]>}
 */
export async function getUserStyles() {
	const result = await chrome.storage.session.get(_userStylesStoreKey)
		.catch(console.error);
	if (!(_userStylesStoreKey in result)) return [];

	if (!Array.isArray(result[_userStylesStoreKey])) {
		throw new Error('userStyles must be an array');
	}
	return result[_userStylesStoreKey];
}
/**
 *
 * @param {UserStyle[]} userStyles
 * @return {Promise<void>}
 */
export function setUserStyles(userStyles) {
	if (!Array.isArray(userStyles)) {
		throw new Error('userStyles must be an array');
	}
	return chrome.storage.session.set({
		[_userStylesStoreKey]: userStyles,
	});
}

/**
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function patternToRegExp(pattern) {
	// Escape special RegExp characters except for '*'
	pattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	// Replace '*' with '.*'
	pattern = pattern.replace(/\*/g, '.*');
	// Create RegExp object
	return new RegExp('^' + pattern + '$');
}

/**
 *
 * @param {number} tabId
 * @param {string|undefined} url
 */
async function onTabUrl(tabId, url) {
	console.dir(url)
	if (url === undefined) {
		/**
		 * If tab is reloaded, url will be undefined so fetching it
		 */
		url = (await chrome.tabs.get(tabId))?.url;
	}
	console.dir(url)

	let domain = null;
	try {
		domain = new URL(url).hostname;
	} catch (_) {}
	if (!domain) {
		console.error('Could not parse domain url');
		return;
	}


	const data = {};
	for (let userStyle of await getUserStyles()) {
		const domainList = data[userStyle.url.domain] ?? [];
		domainList.push(userStyle);
		data[userStyle.url.domain] = domainList;
	}


	/**
	 *
	 * @type {Set<UserStyle>}
	 */
	const matchedStyles = new Set((data[domain] ?? []).concat(data['*'] ?? []));
	for (let matchedStyle of matchedStyles) {
		/**
		 *
		 * @type {CSSInjection}
		 */
		const userStyleOpts = {
			css: matchedStyle.css,
			origin: matchedStyle.asUserStyle ? 'USER' : 'AUTHOR',
			target: {
				tabId,
				allFrames: matchedStyle.allFrames ?? false,
			}
		};

		let doInject = true;
		if (doInject && matchedStyle.url.startWith !== undefined) {
			if (!url.startsWith(matchedStyle.url.startWith)) doInject = false;
		}
		if (doInject && matchedStyle.url.endWith !== undefined) {
			if (!url.endsWith(matchedStyle.url.endWith)) doInject = false;
		}
		if (doInject && matchedStyle.url.regex !== undefined) {
			if (!patternToRegExp(matchedStyle.url.regex).test(url)) doInject = false;
		}

		if (!doInject) {
			chrome.scripting.removeCSS(userStyleOpts)
				.catch(console.error)
			;
			continue;
		}

		chrome.scripting.insertCSS(userStyleOpts)
			.catch(console.error)
		;
	}
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
	if ('url' in changeInfo || changeInfo.status === 'complete') {
		onTabUrl(tabId, changeInfo.url)
			.catch(console.error)
		;
	}
});
