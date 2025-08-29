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

	const wildcardHostRegex = /^((?:\*|\w+):\/\/)\*\./;
	if (wildcardHostRegex.test(patternString)) {
		// Patch *.host that should match *.google.com values like https://google.com
		patternString = patternString.replace(wildcardHostRegex, '$1{:subdomain.}*');
	}
	if (patternString[patternString.length - 1] !== '*') {
		// Patch additional chars at the end of the url
		patternString += '*';
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
	return !!urlPattern.test(urlString);
}
