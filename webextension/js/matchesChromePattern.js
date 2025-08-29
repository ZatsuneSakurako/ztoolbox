/**
 * Checks if a given URL matches a Chrome extension match pattern.
 *
 * @source Gemini AI-generated code
 * @param {string} urlString The URL to check.
 * @param {string} patternString The match pattern (e.g., "*://*.google.com/*", "https://mail.google.com/").
 * @returns {boolean} True if the URL matches the pattern, false otherwise.
 */
export function matchesChromePattern(urlString, patternString) {
	// Handle the special "<all_urls>" pattern
	if (patternString === "<all_urls>") {
		patternString = "*://*/*";
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(urlString);
	} catch (e) {
		// console.error("Invalid URL:", urlString, e);
		return false; // Invalid URL cannot match any pattern
	}

	const uScheme = parsedUrl.protocol.slice(0, -1); // Remove trailing ":"
	if (patternString[0] === "*" && !(uScheme === "http" || uScheme === "https")) {
		// A scheme of * matches only http or https.
		return false;
	}


	/**
	 * @type {URLPattern}
	 */
	let urlPattern
	try {
		urlPattern = new URLPattern(patternString);
	} catch (e) {
		// console.error("Invalid pattern:", patternString, e);
		return false; // Invalid pattern
	}
	if (urlPattern.exec(urlString) !== null) return true;


	if (patternString[patternString.length - 1] !== '/') {
		try {
			urlPattern = new URLPattern(patternString + '/');
			if (urlPattern.exec(urlString) !== null) return true;
		} catch (e) {
			console.error("Invalid pattern (pattern/ patch) :", patternString, e);
		}
	}
	if (patternString[patternString.length - 1] !== '*') {
		try {
			urlPattern = new URLPattern(patternString + '*');
			if (urlPattern.exec(urlString) !== null) return true;
		} catch (e) {
			console.error("Invalid pattern (pattern* patch) :", patternString, e);
		}
	}
	const wildcardHostRegex = /^((?:\*|\w+):\/\/)\*\./;
	if (/^(\*|\w+):\/\/\*\./.test(patternString)) {
		try {
			urlPattern = new URLPattern(patternString.replace(wildcardHostRegex, '$1'));
			if (urlPattern.exec(urlString) !== null) return true;
		} catch (e) {
			console.error("Invalid pattern (*.host patch) :", patternString, e);
		}
	}

	return false;
}
