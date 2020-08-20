import {getPreference, savePreference} from "../options-api.js";

const keepProtecting = true,
	trackingParamNames = [
		'utm_source',
		'utm_campaign',
		'src',
		'sr',
		'sr_source',
		'smid',
		'utm_content',
		'utm_medium',
		'utm_term',
		'utm_cid',
		'mbid',
		'lipi',
		'trk',
		'trackingId',
		'fbclid',
		'gclid',
		'__source',
		'__twitter',
	]
;


/**
 *
 * @type {{source: ?string, return: string[]}}
 */
const cache = {source: null, return: []}
/**
 *
 * @return {string[]}
 */
function cachedExcludedDomains() {
	const unTrackParamsExclude = getPreference('unTrackUrlParamsExclude');
	if (cache.source === unTrackParamsExclude) {
		return cache.return;
	}


	let _domainsExcluded = [];
	if (unTrackParamsExclude.length > 0) {
		_domainsExcluded = _domainsExcluded.concat(unTrackParamsExclude.split(','));
	}

	cache.source = unTrackParamsExclude;
	cache.return = _domainsExcluded;
	setTimeout(() => {
		cache.source = null;
		cache.return = [];
	}, 5000);

	return _domainsExcluded;
}
window.cachedExcludedDomains = cachedExcludedDomains



function onBeforeRequest(details) {
	if (keepProtecting === false || getPreference('unTrackUrlParams') === false) {
		return {};
	}


	const urlObj = new URL(details.url),
		hostnameLowerCase = urlObj.hostname.toLowerCase(),
		hasDomainExcluded = cachedExcludedDomains()
			.find(domain => hostnameLowerCase.includes(domain))
	;
	if (hasDomainExcluded !== undefined || urlObj.search.length === 0 || urlObj.search === '?') {
		return {};
	}


	let hasTracking = false;
	for (let trackingParamName of trackingParamNames) {
		if (urlObj.searchParams.getAll(trackingParamName).length === 0) continue;

		hasTracking = true;
		urlObj.searchParams.delete(trackingParamName);
	}


	if (hasTracking === true) {
		console.log('Tracking detected: ', details.url);
		return {redirectUrl: urlObj.toString()};
	}
	return {};
}



let listenDone = false;
function listen() {
	if (browser.webRequest === undefined) {
		console.debug('browser.webRequest is undefined');
		return;
	}

	// See request before browser navigation to it to block the tracking parts
	browser.webRequest.onBeforeRequest.addListener(
		onBeforeRequest,
		{urls: ["<all_urls>"]},
		["blocking"]
	);
	listenDone = true;
}
listen();
window.webRequestPermissionsListen = listen;
