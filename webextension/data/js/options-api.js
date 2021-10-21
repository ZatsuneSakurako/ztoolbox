'use strict';

import {ChromePreferences} from './classes/chrome-preferences.js';
import {loadTranslations} from './translation-api.js';

const chromeSettings = new ChromePreferences(),
	loadingPromise = (async () => {
		await chromeSettings.loadingPromise;
		await loadTranslations();
	})()
;

export { chromeSettings, loadingPromise };


export function getPreference(prefId) {
	const pref = chromeSettings.get(prefId);
	if (pref !== undefined) {
		return pref;
	}
}
export function savePreference(prefId, value) {
	chromeSettings.set(prefId, value);
}

function settingNode_onChange() {
	const node = this,
		settingName = (node.tagName.toLowerCase()==="input"&&typeof node.type==="string"&&node.type.toLowerCase()==="radio")? node.name : node.id
	;

	if (node.validity.valid) {
		savePreference(settingName, chromeSettings.getValueFromNode(node));
	}
}
async function refreshSettings(event) {
	let prefId = "";
	let prefValue = "";
	if (typeof event.key === "string") {
		prefId = event.key;
		prefValue = event.newValue;
	} else if (typeof event.target === "object") {
		prefId = event.target.id;
		prefValue = getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	let isPanelPage = location.pathname.indexOf("panel.html") !== -1;
	
	if (event.type !== "input" && !(isPanelPage && typeof chromeSettings.options.get(prefId).showPrefInPanel === "boolean" && chromeSettings.options.get(prefId).showPrefInPanel === false) && typeof chromeSettings.options.get(prefId).type === "string" && !(typeof chromeSettings.options.get(prefId).hidden === "boolean" && chromeSettings.options.get(prefId).hidden)) {
		if (prefNode === null) {
			console.warn(`${prefId} node is null`);
		} else {
			switch (chromeSettings.options.get(prefId).type) {
				case 'string':
					if (typeof chromeSettings.options.get(prefId).stringList === 'boolean' && chromeSettings.options.get(prefId).stringList === true) {
						prefNode.value = getFilterListFromPreference(getPreference(prefId)).join("\n");
					} else {
						prefNode.value = prefValue;
					}
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
					prefNode.checked = chromeSettings.getBooleanFromVar(prefValue);
					break;
				case 'control':
					// Nothing to update, no value
					break;
			}
			let body = document.querySelector('body');
			if (prefId === "showAdvanced") {
				if (getPreference('showAdvanced')) {
					body.classList.add('showAdvanced');
				} else {
					body.classList.remove('showAdvanced');
				}
			}
			if (prefId === 'showExperimented') {
				if (getPreference("showExperimented")) {
					body.classList.add("showExperimented");
				} else {
					body.classList.remove("showExperimented");
				}
			}
			if (prefId === "panel_theme" || prefId === "background_color" && typeof theme_update === "function") {
				theme_update()
					.catch(console.error)
				;
			}
		}
	}
}

/*		---- Save/Restaure preferences from sync ----		*/

// Saves/Restaure options from/to browser.storage
function saveOptionsInSync(event) {
	chromeSettings.saveInSync()
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
function restaureOptionsFromSync(event) {
	// Default values
	let mergePreferences = event.shiftKey;
	return chromeSettings.restaureFromSync((typeof mergePreferences === 'boolean')? mergePreferences : false);
}

/*		---- Node generation of settings ----		*/
export function loadPreferences(selector) {
	chromeSettings.loadPreferencesNodes(document.querySelector(selector));

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
	await chromeSettings.prefNode_FileType_onChange(event);
}

/*		---- Import/Export preferences from file ----		*/
async function exportPrefsToFile() {
	await chromeSettings.exportPrefsToFile("ztoolbox", document);
}

async function importPrefsFromFile(event) {
	let mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;

	console.warn("Merge: " + mergePreferences);

	let error = false;
	try {
		await chromeSettings.importPrefsFromFile("ztoolbox", mergePreferences, document);
	} catch (e) {
		error = true;
		console.error(e);
	}

	if (error === false) {
		sendDataToMain("refreshData", "");
	}
}
window.importPrefsFromFile = importPrefsFromFile;
