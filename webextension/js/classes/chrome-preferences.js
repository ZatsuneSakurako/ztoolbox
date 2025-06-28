import {chromeNativeSettingsStorageKey, getSessionNativeIsConnected} from "./chrome-native-settings.js";

export async function savePreference(prefId, value) {
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
	const chromeNativeConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;

	const preferenceIdList = new Set(prefIds);
	preferenceIdList.add(chromeNativeSettingsStorageKey);

	const values = await chrome.storage.local.get([...preferenceIdList]),
		chromeNativeSettings = values[chromeNativeSettingsStorageKey],
		output = new Map()
	;

	for (let [prefId, current_pref] of Object.entries(values)) {
		/*
		 * If chromeNativeSettingsStorageKey because
		 * when internal use, no need to return it
		 */
		if (!prefIds.includes(prefId)) {
			continue;
		}

		if (internalPreferences.includes(prefId)) {
			output.set(prefId, current_pref);
			continue;
		}

		if (chromeNativeConnected && prefId in chromeNativeSettings) {
			current_pref = chromeNativeSettings[prefId];
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
