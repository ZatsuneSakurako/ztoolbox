'use strict';

import {ChromePreferences, getValueFromNode} from './classes/chrome-preferences-ui.js';
import {
	getPreference,
	savePreference,
	getBooleanFromVar,
	getPreferenceConfig, saveInSync, restaureFromSync
} from './classes/chrome-preferences.js';
import {loadTranslations} from './translation-api.js';

export const loadingPromise = loadTranslations();

function settingNode_onChange() {
	const node = this,
		settingName = (node.tagName.toLowerCase()==="input"&&typeof node.type==="string"&&node.type.toLowerCase()==="radio")? node.name : node.id
	;

	if (node.validity.valid) {
		savePreference(settingName, getValueFromNode(node))
			.catch(console.error)
		;
	}
}
async function refreshSettings(event) {
	const options = getPreferenceConfig(true);

	let prefId = "";
	let prefValue = "";
	if (typeof event.key === "string") {
		prefId = event.key;
		prefValue = event.newValue;
	} else if (typeof event.target === "object") {
		prefId = event.target.id;
		prefValue = await getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);

	let isPanelPage = location.pathname.indexOf("panel.html") !== -1;

	if (prefId.charAt(0) === '_' && options.has(prefId) === false) {
		// Ignore internal settings that aren't made to be displayed
		return;
	}

	if (event.type !== "input" && !(isPanelPage && typeof options.get(prefId).showPrefInPanel === "boolean" && options.get(prefId).showPrefInPanel === false) && typeof options.get(prefId).type === "string" && !(typeof options.get(prefId).hidden === "boolean" && options.get(prefId).hidden)) {
		if (prefNode === null) {
			console.warn(`${prefId} node is null`);
		} else {
			switch (options.get(prefId).type) {
				case 'string':
					prefNode.value = prefValue;
					break;
				case 'color':
				case 'menulist':
					if (prefNode.tagName.toLowerCase()==="div") {
						const toCheck = prefNode.querySelector(`[value="${prefValue}"]`);
						if (toCheck) {
							toCheck.checked = true;
						} else {
							console.warn(`Error trying to update "${prefId}"`);
						}
					} else {
						prefNode.value = prefValue;
					}
					break;
				case 'integer':
					prefNode.value = parseInt(prefValue);
					break;
				case 'bool':
					prefNode.checked = getBooleanFromVar(prefValue);
					break;
				case 'control':
					// Nothing to update, no value
					break;
			}
			let body = document.body;
			if (prefId === "showAdvanced") {
				body.classList.toggle('showAdvanced', !!await getPreference("showAdvanced"));
			}
			if (prefId === "showExperimented") {
				body.classList.toggle('showExperimented', !!await getPreference("showExperimented"));
			}
			if (prefId === "simplified_mode") {
				body.classList.toggle('simple-version', !!await getPreference("simplified_mode"));
			}
			if (prefId === "panel_theme" || prefId === "background_color" && typeof theme_update === "function") {
				theme_update()
					.catch(console.error)
				;
			}
		}
	}
}

/*		---- Save/Restore preferences from sync ----		*/

/**
 * @deprecated
 * @param event
 */
function saveOptionsInSync(event) {
	saveInSync()
		.then(() => {
			// Update status to let user know options were saved.
			let status = document.getElementById('status');
			if(status !== null){
				status.textContent = i18ex._('options_saved_sync');

				setTimeout(function() {
					status.textContent = '';
				}, 2500);
			}
		})
		.catch(console.warn)
	;
}
/**
 * @deprecated
 * @param event
 */
async function restoreOptionsFromSync(event) {
	// Default values
	let mergePreferences = event.shiftKey;
	return await restaureFromSync((typeof mergePreferences === 'boolean')? mergePreferences : false);
}

/*		---- Node generation of settings ----		*/
export async function loadPreferences(selector) {
	await ChromePreferences.loadPreferencesNodes(document.querySelector(selector));

	browser.storage.onChanged.addListener((changes, area) => {
		if (area === "local") {
			for (let prefId in changes) {
				if (changes.hasOwnProperty(prefId)) {
					refreshSettings({"key": prefId, oldValue: changes[prefId].oldValue, newValue: changes[prefId].newValue})
						.catch(console.error)
					;
				}
			}
		}
	});
}

if (location.href.endsWith('/options.html')) {
	document.addEventListener('click', function (e) {
		const label = e.target.closest('[data-input-number-control]');
		if (!label) return;

		const input = label.control,
			action = label.dataset.inputNumberControl
		;
		if (action === "moins" || action === "plus") {
			input[action === "plus" ? "stepUp" : "stepDown"](1);
			settingNode_onChange.apply(input, [e, input])
		}
		return false;
	});
	document.addEventListener('input', function (e) {
		const input = e.target.closest("[data-setting-type='string'],[data-setting-type='json']");
		if (!input) return;

		settingNode_onChange.apply(input, [e, input])
	});
	document.addEventListener('change', function (e) {
		const input = e.target.closest("[data-setting-type='integer'],[data-setting-type='bool'],[data-setting-type='color'],input[data-setting-type='menulist'],[data-setting-type='menulist'] input[type='radio']");
		if (!input) return;

		settingNode_onChange.apply(input, [e, input])
	});
	document.addEventListener('click', function (e) {
		const input = e.target.closest("#export_preferences");
		if (!input) return;

		exportPrefsToFile.apply(input, [e, input])
	});
	document.addEventListener('click', function (e) {
		const input = e.target.closest("button[data-setting-type='file']");
		if (!input) return;

		prefNode_FileType_onChange.apply(input, [e, input])
	});
}

/*				---- Import data from ----				*/
async function prefNode_FileType_onChange(event) {
	await ChromePreferences.prefNode_FileType_onChange(event);
}

/*		---- Import/Export preferences from file ----		*/
async function exportPrefsToFile() {
	await ChromePreferences.exportPrefsToFile("ztoolbox");
}

export async function importPrefsFromFile(event) {
	let mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;

	console.warn("Merge: " + mergePreferences);

	let error = false;
	try {
		await ChromePreferences.importPrefsFromFile("ztoolbox", mergePreferences);
	} catch (e) {
		error = true;
		console.error(e);
	}

	if (error === false) {
		sendDataToMain("refreshData", "");
	}
}
