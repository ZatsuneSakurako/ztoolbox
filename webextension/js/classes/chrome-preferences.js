import {options as _options} from '/js/options-data.js';

export function getPreferenceConfig(returnMap=false) {
	const options = JSON.parse(JSON.stringify(_options)),
		mapOptions = new Map()
	;

	if (!returnMap) return options;

	for (let [id, data] of Object.entries(options)) {
		mapOptions.set(id, data);
	}

	return mapOptions;
}

/**
 *
 * @param {string} string
 * @return {number|string|boolean}
 */
export function getBooleanFromVar(string) {
	switch (typeof string) {
		case "boolean":
			return string;
		case "number":
		case "string":
			if (string === "true" || string === "on" || string === 1) {
				return true;
			} else if (string === "false" || string === "off" || string === 0) {
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}

export async function savePreference(prefId, value) {
	const options = getPreferenceConfig(true),
		configOption = options.get(prefId)
	;

	if (!!configOption) {
		if (configOption.type === 'integer') {
			if (typeof configOption.minValue === "number" && parseInt(value) < configOption.minValue) {
				value = configOption.minValue;
			} else if (typeof configOption.maxValue === "number" && parseInt(value) > configOption.maxValue) {
				value = configOption.maxValue;
			}
		}

		if (typeof configOption.value === "boolean" || typeof configOption.value === "number") {
			value = value.toString();
		}
	}

	return await browser.storage.local.set({
		[prefId]: value
	})
		.catch(console.error)
	;
}

export async function getPreferences(...prefIds) {
	const options = getPreferenceConfig(true);

	if (prefIds.length <= 0) {
		prefIds = [...options.keys()];
	}

	const values = await browser.storage.local.get(prefIds),
		output = new Map()
	;

	for (let prefId of prefIds) {
		if (!values.hasOwnProperty(prefId)) {
			const optionConfig = options.get(prefId);
			if (optionConfig && (optionConfig.type === "control" || optionConfig.type === "file")) {
				continue;
			}

			if (optionConfig) {
				output.set(prefId, optionConfig.value);
				await savePreference(prefId, optionConfig.value);
				console.warn(`Preference ${prefId} not found, using default`);
			} else {
				console.warn(`Preference ${prefId} not found, and no default`);
			}
		}
	}

	for (let [prefId, current_pref] of Object.entries(values)) {
		const optionConfig = options.get(prefId);
		if (!optionConfig) {
			console.warn(`Unknown preference "${prefId}"`);
			continue;
		}

		switch (optionConfig.type) {
			case "string":
			case "color":
			case "menulist":
				// No internal process to the value
				break;
			case "json":
				if (typeof current_pref === 'string') {
					current_pref = JSON.parse(current_pref);
				}
				break;
			case "integer":
				if (typeof current_pref === 'string' && isNaN(parseInt(current_pref))) {
					console.warn(`${prefId} is not a number (${current_pref})`);
					current_pref = this.defaultSettings.get(prefId);
				}

				if (typeof optionConfig.minValue === "number" && parseInt(current_pref) < optionConfig.minValue) {
					current_pref = optionConfig.minValue;
					break;
				} else if (typeof optionConfig.maxValue === "number" && parseInt(current_pref) > optionConfig.maxValue) {
					current_pref = optionConfig.maxValue;
					break;
				} else {
					current_pref = parseInt(current_pref);
					break;
				}
			case "bool":
				current_pref = getBooleanFromVar(current_pref);
				break;
			case "file":
				// No internal process to the value
				break;
			default:
				console.warn(`Unknown type for preference ${prefId} : "${optionConfig.type}"`);
		}

		output.set(prefId, current_pref);
	}

	return output;
}

export async function getPreference(prefId) {
	const values = await getPreferences(prefId);
	return values.get(prefId);
}

/**
 *
 * @param {...string} prefIds
 * @returns {Promise<void>}
 */
export function deletePreferences(...prefIds) {
	return browser.storage.local.remove(prefIds)
}

/*		    ---- Export/Import preferences ----	    	*/

/**
 *
 * @param {JSON} preferences
 * @param {Boolean=false} mergePreferences
 */
export async function importFromJSON(preferences, mergePreferences=false) {
	const options = getPreferenceConfig(true);

	for (let prefId in preferences) {
		if (!preferences.hasOwnProperty(prefId)){
			continue;
		}

		const optionConf = options.get(prefId);
		if (!!optionConf && !['control', 'file', 'json'].includes(optionConf.type) && typeof preferences[prefId] === typeof optionConf.value) {
			if(mergePreferences) {
				await savePreference(prefId, preferences[prefId]);
			} else {
				await savePreference(prefId, preferences[prefId]);
			}
		} else if (!!optionConf && optionConf.type === 'json' && ['string', 'object'].includes(typeof preferences[prefId])) {
			let jsonValue = preferences[prefId];
			if (typeof jsonValue === 'string') {
				jsonValue = JSON.parse(jsonValue);
			}
			await savePreference(prefId, jsonValue);
		} else {
			console.warn(`Error trying to import ${prefId}`);
		}
	}
}

/*		---- Save/Restore preferences from sync ----		*/

export async function getSyncPreferences() {
	let obj = {};
	const options = getPreferenceConfig(true);

	for (const [prefId, option] of options) {
		if (option.hasOwnProperty("sync") === true && option.sync === false) {
			continue;
		} else if(option.type === "control" || option.type === "file") {
			continue;
		}

		obj[prefId] = await getPreference(prefId);
	}

	return obj;
}

export function getSyncKeys() {
	const options = getPreferenceConfig(true);

	let keysArray = [];
	for (const [prefId, ] of options) {
		if (option.hasOwnProperty("sync") === true && option.sync === true) {
			keysArray.push(prefId);
		}
	}

	return keysArray;
}
