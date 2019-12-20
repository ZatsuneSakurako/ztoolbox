"use strict";

/**
 *
 * @return {Promise<string[]>}
 */
async function getVersions() {
	const geckoManifest = browser.runtime.getManifest().applications.gecko;
	if (typeof geckoManifest !== 'object' || geckoManifest === null || typeof geckoManifest.id !== 'string' || typeof geckoManifest.update_url !== 'string') {
		throw 'ConfigMissing';
	}

	const webExt = {
		'id': geckoManifest.id,
		'updateUrl': geckoManifest.update_url
	};



	let res, data;
	try {
		res = await fetch(webExt.updateUrl);
		data = await res.json();
	} catch (e) {
		console.error(e);
	}

	if (res.ok !== true || typeof data !== 'object' || data === null) {
		throw 'FetchError';
	}

	if (data.hasOwnProperty('addons') === false || data.addons.hasOwnProperty(webExt.id) === false) {
		throw 'ExtensionNotFound';
	}

	if (typeof data.addons[webExt.id] !== 'object' || Array.isArray(data.addons[webExt.id].updates) !== true) {
		return [];
	}

	return data.addons[webExt.id].updates.map(item => {
		if (typeof item !== 'object' || item === null) {
			return;
		}

		return item.version;
	})
}

/**
 *
 * @return {Promise<boolean>}
 */
async function checkHasUpdate() {
	const currentVersion = new Version(browser.runtime.getManifest().version),
		versions = await getVersions()
	;

	for (let version of versions) {
		if (currentVersion.compareTo(new Version(version)) === 1) {
			return true;
		}
	}

	return false;
}



export {getVersions, checkHasUpdate};
