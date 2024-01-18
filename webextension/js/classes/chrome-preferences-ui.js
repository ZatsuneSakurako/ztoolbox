import {getBooleanFromVar, getPreference, getPreferenceConfig, savePreference} from './chrome-preferences.js';


/*		---- events handling ----		*/

function settingNode_onChange() {
	const node = this;
	if (node.validity.valid) {
		savePreference(node.id, getValueFromNode(node))
			.catch(console.error)
		;
	}
}
document.addEventListener('input', function (e) {
	const input = e.target.closest("input[type='text'],textarea[type='json']");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});
document.addEventListener('change', function (e) {
	const input = e.target.closest("input[type='number'],input[type='checkbox'],input[type='color'],select");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});



/*		---- refresh pref input ----		*/

async function refreshSettings(prefId, newValue) {
	const options = getPreferenceConfig(true),
		prefNode = document.querySelector(`#preferences #${prefId}`)
	;

	if (prefId.charAt(0) === '_' && options.has(prefId) === false) {
		// Ignore internal settings that aren't made to be displayed
		return;
	}

	if (prefNode === null) {
		console.warn(`${prefId} node is null`);
		return;
	}

	switch (options.get(prefId).type) {
		case 'text':
			prefNode.value = newValue;
			break;
		case 'json':
			prefNode.value = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
			break;
		case 'color':
		case 'menulist':
			prefNode.value = newValue;
			break;
		case 'number':
			prefNode.value = parseInt(newValue);
			break;
		case 'checkbox':
			prefNode.checked = getBooleanFromVar(newValue);
			break;
	}
}
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === "local") {
		for (let prefId in changes) {
			if (!changes.hasOwnProperty(prefId)) continue;

			refreshSettings(prefId, changes[prefId].newValue)
				.catch(console.error)
			;
		}
	}
});

/*		---- get/save preference ----		*/

/**
 *
 * @param {HTMLInputElement} node
 * @return {void|string|boolean|number}
 */
function getValueFromNode(node) {
	const options = getPreferenceConfig(true),
		prefObj = options.get(node.id)
	;

	if (!prefObj) {
		throw new Error('UNKNOWN_PREFERENCE');
	}

	const tagName = node.tagName.toLowerCase();
	if (tagName === "textarea" && prefObj.type === "json") {
		let json;
		try {
			json = JSON.parse(node.value);
		} catch (err) {
			console.error(err);
		}
		return json;
	} else if (node.type === "checkbox") {
		return node.checked;
	} else if (tagName === "input" && node.type === "number") {
		return parseInt(node.value);
	} else if (typeof node.value === "string") {
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

export async function loadPreferencesNodes() {
	const options = getPreferenceConfig(true);
	for (const [id, option] of options) {
		if (typeof option.type === "undefined") {
			continue;
		}
		if (option.hasOwnProperty("hidden") && option.hidden === true) {
			continue;
		}


		const labelNode = document.querySelector(`label[for="${id}"]`);
		if (!labelNode) {
			console.error(`LABEL_NOT_FOUND "${id}"`);
			continue;
		}
		labelNode.dataset.translateId = `${id}_title`;

		const prefNode = document.querySelector(`[id="${id}"]`);
		if (!prefNode) throw new Error(`INPUT_NOT_FOUND "${id}"`);
		if (option.type === "number") {
			if (typeof option.minValue === "number") {
				prefNode.min = option.minValue;
			}
			if (typeof option.maxValue === "number") {
				prefNode.max = option.maxValue;
			}
		} else if (option.type === "menulist") {
			for (let optionNode of prefNode.options) {
				optionNode.dataset.translateId = `${id}_${optionNode.value}`;
			}
		}

		refreshSettings(id, await getPreference(id))
			.catch(console.error)
		;
	}
}

