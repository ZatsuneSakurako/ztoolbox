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

    // 1. Parse the Match Pattern
    let pScheme, pHost, pPath;

    const schemeEndIndex = patternString.indexOf("://");
    if (schemeEndIndex === -1) {
        console.error("Invalid pattern format. Expected <scheme>://<host><path> or <all_urls>. Pattern:", patternString);
        return false;
    }

    pScheme = patternString.substring(0, schemeEndIndex);
    const hostAndPathString = patternString.substring(schemeEndIndex + 3);

    let pathStartIndex = hostAndPathString.indexOf("/");
    if (pathStartIndex === -1) {
        // Pattern like "http://example.com" (no trailing slash for path)
        pHost = hostAndPathString;
        pPath = "/"; // Default path is "/"
    } else {
        pHost = hostAndPathString.substring(0, pathStartIndex);
        pPath = hostAndPathString.substring(pathStartIndex); // Path includes the leading "/"
    }

    // 2. Parse the URL
    let parsedUrl;
    try {
        parsedUrl = new URL(urlString);
    } catch (e) {
        // console.error("Invalid URL:", urlString, e);
        return false; // Invalid URL cannot match any pattern
    }

    const uScheme = parsedUrl.protocol.slice(0, -1); // Remove trailing ":"
    const uHost = parsedUrl.hostname;
    // The path for matching includes pathname, search, and hash.
    const uPath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;

    // 3. Match Scheme
    if (pScheme !== "*" && pScheme !== uScheme) {
        return false;
    }
    if (pScheme === "*" && !(uScheme === "http" || uScheme === "https")) {
        // A scheme of * matches only http or https.
        return false;
    }

    // 4. Match Host
    if (pHost === "*") {
        // Wildcard host matches any host, proceed.
    } else if (pHost.startsWith("*.")) {
        // e.g., "*.google.com"
        const domainSuffix = pHost.substring(1); // ".google.com"
        if (uHost !== pHost.substring(2) && !uHost.endsWith(domainSuffix)) {
            // uHost must be "google.com" OR end with ".google.com"
            return false;
        }
    } else {
        // Exact host match required.
        if (pHost !== uHost) {
            return false;
        }
    }

    // 5. Match Path
    // Convert pattern path to a regex.
    // Escape all special regex characters in pPath, then replace pattern's * with regex's .*
    // The pattern path must match from the beginning of the URL's path.
    const pathRegexString = "^" + pPath
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape standard regex chars
        .replace(/\*/g, '.*');                // Convert pattern's * to regex's .*

    const pathRegex = new RegExp(pathRegexString);
    if (!pathRegex.test(uPath)) {
        return false;
    }

    // If all parts match, the URL matches the pattern.
    return true;
}
