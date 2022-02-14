import {options as _options} from '/data/js/options-data.js';
export const CHROME_PREFERENCES_UPDATED_ID = '_updated',
	CHROME_PREFERENCES_SYNC_ID = '_synchronisedAt'
;

export function getPreferenceConfig(returnMap=false) {
	const options = JSON.parse(JSON.stringify(_options)),
		mapOptions = new Map()
	;

	options[CHROME_PREFERENCES_UPDATED_ID] = {
		"hidden": true,
		"prefLevel": "experimented",
		"sync": true,
		"type": "string",
		"value": ""
	};
	options[CHROME_PREFERENCES_SYNC_ID] = {
		"hidden": true,
		"prefLevel": "experimented",
		"sync": false,
		"type": "string",
		"value": ""
	};

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
	switch(typeof string) {
		case "boolean":
			return string;
		case "number":
		case "string":
			if(string === "true" || string === "on" || string === 1){
				return true;
			} else if(string === "false" || string === "off" || string === 0){
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

	const storagePush = {
		[prefId]: value
	};
	if (prefId !== CHROME_PREFERENCES_UPDATED_ID) {
		// Keep '_updated' value up-to-date with the last change date
		storagePush[CHROME_PREFERENCES_UPDATED_ID] = new Date();
	}

	return await browser.storage.local.set(storagePush)
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
			case "json":
			case "color":
			case "menulist":
				// No internal process to the value
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
				console.warn(`Unknow type for preference ${prefId} : "${optionConfig.type}"`);
		}

		output.set(prefId, current_pref);
	}

	return output;
}

export async function getPreference(prefId) {
	const values = await getPreferences(prefId);
	return values.get(prefId);
}
