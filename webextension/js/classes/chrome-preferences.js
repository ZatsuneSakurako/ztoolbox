import {options as _options} from '/js/options-data.js';
import {chromeNativeSettingsStorageKey} from "./chrome-native-settings.js";

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
		if (configOption.type === 'number') {
			if (typeof configOption.minValue === "number" && parseInt(value) < configOption.minValue) {
				value = configOption.minValue;
			} else if (typeof configOption.maxValue === "number" && parseInt(value) > configOption.maxValue) {
				value = configOption.maxValue;
			}
		}
	}

	return await chrome.storage.local.set({
		[prefId]: value
	})
		.catch(console.error)
	;
}

/**
 *
 * @type {string[]}
 */
const internalPreferences = Object.freeze([chromeNativeSettingsStorageKey]);

/**
 *
 * @param {...string[]} prefIds
 * @return {Promise<Map<any, any>>}
 */
export async function getPreferences(...prefIds) {
	const options = getPreferenceConfig(true);

	if (prefIds.length <= 0) {
		prefIds = [...options.keys()];
	}

	const preferenceIdList = new Set(prefIds);
	preferenceIdList.add(chromeNativeSettingsStorageKey);
	preferenceIdList.add('mode');

	const values = await chrome.storage.local.get([...preferenceIdList]),
		chromeNativeSettings = values[chromeNativeSettingsStorageKey],
		output = new Map()
	;

	for (let prefId of prefIds) {
		if (!values.hasOwnProperty(prefId)) {
			const optionConfig = options.get(prefId);
			if (!optionConfig) {
				console.warn(`Preference ${prefId} not found, and no default`);
				continue;
			}

			output.set(prefId, optionConfig.value);
			await savePreference(prefId, optionConfig.value);
			console.warn(`Preference ${prefId} not found, using default`);
		}
	}

	for (let [prefId, current_pref] of Object.entries(values)) {
		/*
		 * If 'mode' or chromeNativeSettingsStorageKey
		 * because when internal use, no need to return them
		 */
		if (!prefIds.includes(prefId)) {
			continue;
		}

		if (internalPreferences.includes(prefId)) {
			output.set(prefId, current_pref);
			continue;
		}

		if (values['mode'] === 'delegated' && prefId in chromeNativeSettings) {
			current_pref = chromeNativeSettings[prefId];
		}

		const optionConfig = options.get(prefId);
		if (!optionConfig) {
			console.warn(`Unknown preference "${prefId}"`);
			continue;
		}

		switch (optionConfig.type) {
			case "text":
			case "color":
			case "menulist":
				// No internal process to the value
				break;
			case "json":
				if (typeof current_pref === 'string') {
					current_pref = JSON.parse(current_pref);
				}
				break;
			case "number":
				if (typeof current_pref === 'string' && isNaN(parseInt(current_pref))) {
					console.warn(`${prefId} is not a number (${current_pref})`);
					current_pref = optionConfig.value;
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
	return chrome.storage.local.remove(prefIds)
}

/**
 *
 * @return {string[]}
 */
export function getSyncKeys() {
	const options = getPreferenceConfig(true);

	let keysArray = [];
	for (const [prefId, option] of options) {
		if (!('sync' in option) || option.sync !== true) continue;

		keysArray.push(prefId);
	}

	return keysArray;
}
