import {
	getBooleanFromVar,
	getPreferenceConfig,
	savePreference,
	getPreference
} from './chrome-preferences.js';



/*		---- events handling ----		*/

function settingNode_onChange() {
	const node = this,
		settingName = (node.tagName.toLowerCase()==="input"&&typeof node.type==="string"&&node.type.toLowerCase()==="radio")? node.name : node.id
	;

	if (node.validity.valid) {
		console.dir(getValueFromNode(node))
		savePreference(settingName, getValueFromNode(node))
			.catch(console.error)
		;
	}
}
document.addEventListener('input', function (e) {
	const input = e.target.closest("[data-setting-type='text'],[data-setting-type='json']");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});
document.addEventListener('change', function (e) {
	const input = e.target.closest("[data-setting-type='number'],[data-setting-type='bool'],[data-setting-type='color'],select[data-setting-type='menulist']");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});



/*		---- refresh pref input ----		*/

async function refreshSettings(prefId, oldValue, newValue) {
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
		case 'color':
		case 'menulist':
			prefNode.value = newValue;
			break;
		case 'number':
			prefNode.value = parseInt(newValue);
			break;
		case 'bool':
			prefNode.checked = getBooleanFromVar(newValue);
			break;
	}
	let body = document.body;
	if (prefId === "mode") {
		body.classList.toggle('delegated-version', (await getPreference("mode")) === 'delegated');
		body.classList.toggle('normal-version', (await getPreference("mode")) === 'normal');
	}
}
chrome.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;

	for (let prefId in changes) {
		if (!changes.hasOwnProperty(prefId)) continue;

		refreshSettings(prefId, changes[prefId].oldValue, changes[prefId].newValue)
			.catch(console.error)
		;
	}
});

/*		---- get/save preference ----		*/

/**
 *
 * @param {HTMLInputElement} node
 * @return {void|string|boolean|number}
 */
function getValueFromNode(node) {
	const tagName = node.tagName.toLowerCase();
	if (tagName === "textarea" && node.dataset.settingType === "json") {
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

/**
 *
 * @param {HTMLElement} container
 */
export async function loadPreferencesNodes(container) {
	const body = document.body;

	const options = getPreferenceConfig(true);
	for (const [id, option] of options) {
		if (typeof option.type === "undefined") {
			continue;
		}
		if (option.hasOwnProperty("hidden") && option.hidden === true) {
			continue;
		}

		if (id === "mode") {
			const mode = await getPreference("mode");
			body.classList.toggle('delegated-version', mode === 'delegated');
			body.classList.toggle('normal-version', mode === 'normal');
		}

		let groupNode = null;
		if (typeof option.group === "string" && option.group !== "") {
			const groupId = option.group;
			groupNode = document.querySelector(`#${groupId}.pref_group`);

			if (groupNode === null) {
				groupNode = document.createElement("div");
				groupNode.id = groupId;
				groupNode.classList.add("pref_group");
				container.appendChild(groupNode);
			}
		}

		if (groupNode === null) {
			groupNode = container;
		}

		groupNode.appendChild(await newPreferenceNode(groupNode, id));
	}
}

/**
 *
 * @param {HTMLElement} parent
 * @param {String} id
 * @return {HTMLDivElement}
 */
async function newPreferenceNode(parent, id){
	const options = getPreferenceConfig(true),
		prefObj = options.get(id)
	;

	const node = document.createElement("div");
	node.classList.add("preferenceContainer");
	node.classList.add("preferenceContainer--" + id);

	if (typeof prefObj.disabledInDelegatedMode === "boolean" && !!prefObj.disabledInDelegatedMode) {
		node.classList.add('if-not-delegated-version');
	}
	if (typeof prefObj.onlyDelegatedMode === "boolean" && !!prefObj.onlyDelegatedMode) {
		node.classList.add('if-delegated-version');
	}

	const labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if (typeof prefObj.description === "string") {
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;

	const title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title;
	title.dataset.translateId = `${id}_title`;
	labelNode.appendChild(title);

	let prefNode = null;
	const prefValue = await getPreference(id);
	if (prefObj.type === "text" || prefObj.type === "bool" || prefObj.type === "color" || prefObj.type === "number") {
		prefNode = document.createElement("input");
		prefNode.type = prefObj.type;
		prefNode.required = true;

		if (prefObj.type === "bool") {
			prefNode.checked = getBooleanFromVar(prefValue);
		} else if (prefObj.type === "number") {
			if (typeof prefObj.minValue === "number") {
				prefNode.min = prefObj.minValue;
			}
			if (typeof prefObj.maxValue === "number") {
				prefNode.max = prefObj.maxValue;
			}
			prefNode.value = parseInt(prefValue);
		} else {
			prefNode.value = prefValue;
		}
	} else if (prefObj.type === "json") {
		prefNode = document.createElement("textarea");
		prefNode.value = JSON.stringify(prefValue);
	} else if (prefObj.type === "menulist") {
		prefNode = document.createElement("select");
		prefNode.size = Array.isArray(prefObj.options) && prefObj.options.length <= 5 ? prefObj.options.length : 1;

		for (let option of Object.values(prefObj.options)) {
			let optionNode = document.createElement("option");
			optionNode.text = option.label;
			optionNode.value = option.value;
			optionNode.dataset.translateId = `${id}_${option.value}`;

			prefNode.add(optionNode);
		}

		prefNode.value = prefValue;
	}

	if (!prefNode) {
		throw new Error('UNKNOWN_TYPE');
	}

	prefNode.id = id;
	prefNode.dataset.settingType = prefObj.type;

	if (prefObj.type === "bool") {
		node.appendChild(prefNode);
		node.appendChild(labelNode);
	} else {
		node.appendChild(labelNode);
		node.appendChild(prefNode);
	}

	return node;
}
