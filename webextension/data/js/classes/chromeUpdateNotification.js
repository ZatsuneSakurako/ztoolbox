"use strict";

export const VERSION_NUMBERS_REG =  /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/;

export class Version extends Array {
	constructor(str) {
		if (typeof str !== 'string' && VERSION_NUMBERS_REG.test(str) === false) {
			super();
		} else {
			super();
			this._setVersion(str);
		}
	}

	/**
	 *
	 * @param {string} stringVersion
	 * @return {this}
	 * @private
	 */
	_setVersion(stringVersion) {
		const [, ...arr] = VERSION_NUMBERS_REG.exec(stringVersion);

		if (arr.length > 0) {
			if (arr.length === 4 && arr[3] === undefined) {
				arr.splice(3, 1);
			}

			arr.map(v => {
				return parseInt(v);
			});
		}

		this.splice(0, this.length);
		this.push(...arr);

		return this;
	}

	/**
	 *
	 * @param {string} stringVersion
	 * @return {this}
	 */
	setVersion(stringVersion) {
		if (typeof str !== 'string' && VERSION_NUMBERS_REG.test(stringVersion) === false) {
			throw 'InvalidString';
		}

		return this._setVersion(stringVersion);
	}

	/**
	 * @param {Version} otherVersion
	 * @return {number} -1 : < || 0 : = || 1 : >
	 */
	compareTo(otherVersion) {
		if (!(otherVersion instanceof Version)) {
			throw 'WrongArgument';
		}

		if (this.join(".") === otherVersion.join('.')) {
			return 0;
		}

		const other = otherVersion.toNumber(),
			current = this.toNumber()
		;

		let isUpdated = current > other;



		if (this.length !== otherVersion.length) {
			/*
			 * Consider there is no beta (versions like x.x.x.*) after a release (versions like x.x.x, of the same base version)
			 * For exemple, 1.2.3 > 1.2.3.1
			 */
			if (otherVersion.length === 5 && this.length === 4) {
				isUpdated = current >= Math.trunc(other);
			} else if (otherVersion.length === 4 && this.length === 5) {
				isUpdated = current > Math.trunc(other);
			}
		}

		return (isUpdated === true)? 1 : -1;
	}

	/**
	 * @return {number}
	 */
	toNumber() {
		let version = 0;

		if(this.length === 3 || this.length === 4){
			for(let i=0; i < this.length; i++){
				version += this[i] * Math.pow(10, 3 * (2 - i));
			}
		}

		return version;
	}
}



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

	for (let remoteVersion of versions) {
		if (new Version(remoteVersion).compareTo(currentVersion) === 1) {
			return true;
		}
	}

	return false;
}



export const ChromeUpdateNotification = {
	getVersions,
	checkHasUpdate
};
