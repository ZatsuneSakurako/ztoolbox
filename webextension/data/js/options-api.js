'use strict';

import { ChromePreferences } from './classes/chrome-preferences.js';
import { i18extended } from './classes/i18extended.js';

const optionPromise = (async function () {
	return (await import('./options-data.js')).options
})();

const chromeSettings = new ChromePreferences(optionPromise),
	loadingPromise = (async () => {
		await chromeSettings.loadingPromise;

		const {i18extended} = await import('./classes/i18extended.js');
		window.i18ex = new i18extended(browser.i18n.getMessage("language"));
		await i18ex.loadingPromise;
	})()
;

export { chromeSettings, loadingPromise };

/*		---- Nodes translation ----		*/
function translateNodes() {
	for (let node of document.querySelectorAll("[data-translate-id]")) {
		if (typeof node.tagName === "string") {
			node.textContent = i18ex._(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}

if (typeof Opentip !== "undefined") {
	Opentip.styles.myDark = {
		// Make it look like the alert style. If you omit this, it will default to "standard"
		extends: "dark",
		background: "#212121",
		borderColor: "#212121"
	};
	Opentip.defaultStyle = "myDark"; // The default is "standard"
}

/**
 *
 * @type {Map<string, Opentip>}
 */
const openTipObjets =  new Map();
function translateNodes_title() {
	for (let node of document.querySelectorAll("[data-translate-title]")) {
		if (typeof node.tagName === "string") {
			const titleText =  i18ex._(node.dataset.translateTitle);

			let myOpentip = !!node.id? openTipObjets.get(node.id) : undefined;
			let error = false;
			if (!!myOpentip) {
				myOpentip.setContent(titleText);
				if (titleText.length === 0) {
					myOpentip.deactivate();
				} else {
					myOpentip.activate();
				}
			} else if (titleText.length > 0) {
				try {
					const Ot = Opentip;
					if (node.dataset.tooltipPosition) {
						myOpentip = new Ot(node, titleText, "", {
							"tipJoint": node.dataset.tooltipPosition
						})
					} else {
						myOpentip = new Ot(node, titleText)
					}
				} catch (err) {
					console.warn(err);
					error = true;
				}
			}

			if (error === false) {
				!!node.id && openTipObjets.set(node.id, myOpentip);
				delete node.dataset.translateTitle;
				node.removeAttribute("title");
			}
		}
	}
}

export function loadTranslations() {
	i18ex.loadingPromise
		.then(()=>{
			let body = document.querySelector('body'),
				observer = new MutationObserver(function(mutations) {
					mutations.forEach(function(mutation) {
						if (mutation.type === "childList") {
							translateNodes(document);
							translateNodes_title(document);
						} else if (mutation.type === "attributes") {
							switch (mutation.attributeName) {
								case 'data-translate-id':
									translateNodes();
									break;
								case 'data-translate-title':
									translateNodes_title();
									break;
							}
						}
					});
				});

			// configuration of the observer:
			const config = {
				attributes: true,
				childList: true,
				subtree: true
			};

			translateNodes();
			translateNodes_title();

			// pass in the target node, as well as the observer options
			observer.observe(body, config);

			// later, you can stop observing
			//observer.disconnect();
		})
	;
}

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
			if (prefId === "hourlyAlarm") {
				sendDataToMain("hourlyAlarm_update")
					.catch(console.error)
				;
			}
			if (
				typeof applyPanelSize === "function"
				&&
				(prefId === "panel_height" || prefId === "panel_width")
			) {
				applyPanelSize();
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
