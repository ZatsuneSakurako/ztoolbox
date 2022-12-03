import {
	getBooleanFromVar,
	getPreferenceConfig,
	savePreference,
	getPreference,
	getSyncPreferences,
	importFromJSON
} from './chrome-preferences.js';



async function sendDataToMain(id, data) {
	chrome.runtime.sendMessage({
		id,
		data: data ?? null
	})
		.catch(console.error)
	;
}

/*		---- events handling ----		*/

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
document.addEventListener('click', function (e) {
	const label = e.target.closest('[data-input-number-control]');
	if (!label) return;

	const input = label.control,
		action = label.dataset.inputNumberControl
	;
	if (action === "moins" || action === "plus") {
		input[action === "plus" ? "stepUp" : "stepDown"](1);
		settingNode_onChange.apply(input, [e, input]);
	}
	return false;
});
document.addEventListener('input', function (e) {
	const input = e.target.closest("[data-setting-type='string'],[data-setting-type='json']");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});
document.addEventListener('change', function (e) {
	const input = e.target.closest("[data-setting-type='integer'],[data-setting-type='bool'],[data-setting-type='color'],input[data-setting-type='menulist'],[data-setting-type='menulist'] input[type='radio']");
	if (!input) return;

	settingNode_onChange.apply(input, [e, input]);
});



// Import/Export preferences from file
document.addEventListener('click', function (e) {
	const input = e.target.closest("#export_preferences");
	if (!input) return;

	exportPreferencesToFile.apply(input, [e, input]);
});

// Import data from
document.addEventListener('click', function (e) {
	const input = e.target.closest("button[data-setting-type='file']");
	if (!input) return;

	prefNode_FileType_onChange.apply(input, [e, input]);
});



document.addEventListener('click', function (event) {
	const input = event.target.closest('#import_preferences');
	if (!input) return;

	if (input.checked === false) return;


	const mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;
	console.warn("Merge: " + mergePreferences);

	importPreferencesFromFile("ztoolbox", mergePreferences)
		.then(async () => {
			try {
				await sendDataToMain("refreshData", "");
			} catch (e) {
				console.error(e);
			}
		})
		.catch(console.error)
	;
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

	if (typeof options.get(prefId).type !== "string" || typeof options.get(prefId).hidden === "boolean" && options.get(prefId).hidden) {
		return;
	}

	if (prefNode === null) {
		console.warn(`${prefId} node is null`);
		return;
	}

	switch (options.get(prefId).type) {
		case 'string':
			prefNode.value = newValue;
			break;
		case 'color':
		case 'menulist':
			if (prefNode.tagName.toLowerCase() === "div") {
				const toCheck = prefNode.querySelector(`[value="${newValue}"]`);
				if (toCheck) {
					toCheck.checked = true;
				} else {
					console.warn(`Error trying to update "${prefId}"`);
				}
			} else {
				prefNode.value = newValue;
			}
			break;
		case 'integer':
			prefNode.value = parseInt(newValue);
			break;
		case 'bool':
			prefNode.checked = getBooleanFromVar(newValue);
			break;
		case 'control':
			// Nothing to update, no value
			break;
	}
	let body = document.body;
	if (prefId === "showAdvanced") {
		body.classList.toggle('showAdvanced', !!await getPreference("showAdvanced"));
	}
	if (prefId === "mode") {
		body.classList.toggle('delegated-version', (await getPreference("mode")) === 'delegated');
		body.classList.toggle('simple-version', (await getPreference("mode")) === 'simplified');
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
	if (tagName === "textarea") {
		if (node.dataset.settingType === "json") {
			let json;
			try {
				json = JSON.parse(node.value);
			} catch (err) {
				console.error(err);
			}
			return json;
		} else if (node.dataset.stringTextarea === "true") {
			return node.value.replace(/\n/g, "");
		} else {
			return node.value;
		}
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
	const isPanelPage = container.baseURI.indexOf("panel.html") !== -1,
		body = document.body
	;

	const options = getPreferenceConfig(true);
	for (const [id, option] of options) {
		if (typeof option.type === "undefined") {
			continue;
		}
		if (option.hasOwnProperty("hidden") && option.hidden === true) {
			continue;
		}

		if (id === "showAdvanced") {
			body.classList.toggle('showAdvanced', !!await getPreference("showAdvanced"));
		}
		if (id === "mode") {
			const mode = await getPreference("mode");
			body.classList.toggle('delegated-version', mode === 'delegated');
			body.classList.toggle('simple-version', mode === 'simplified');
			body.classList.toggle('normal-version', mode === 'normal');
		}

		if(isPanelPage && ((typeof option.prefLevel === "string" && option.prefLevel === "experimented") || (option.hasOwnProperty("showPrefInPanel") && typeof option.showPrefInPanel === "boolean" && option.showPrefInPanel === false))){
			continue;
		}

		let groupNode = null;
		if (typeof option.group === "string" && option.group !== "") {
			const groupId = option.group;
			groupNode = document.querySelector(`#${groupId}.pref_group`);

			if (groupNode === null) {
				groupNode = document.createElement("div");
				groupNode.id = groupId;
				groupNode.classList.add("pref_group");
				if(groupId === "dailymotion" || groupId === "smashcast" || groupId === "hitbox" || groupId === "twitch" || groupId === "mixer" || groupId === "beam"){
					groupNode.classList.add("website_pref");
				}
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

	let node = document.createElement("div");
	node.classList.add("preferenceContainer");
	node.classList.add("preferenceContainer--" + id);
	if (typeof prefObj.prefLevel === "string") {
		node.classList.add(prefObj.prefLevel);
	}

	if (typeof prefObj.disabledInSimpleMode === "boolean" && !!prefObj.disabledInSimpleMode) {
		node.classList.add('if-not-simple-version');
	}
	if (typeof prefObj.disabledInDelegatedMode === "boolean" && !!prefObj.disabledInDelegatedMode) {
		node.classList.add('if-not-delegated-version');
	}
	if (typeof prefObj.disabledInNormalMode === "boolean" && !!prefObj.disabledInNormalMode) {
		node.classList.add('if-not-normal-version');
	}
	if (typeof prefObj.onlyNormalMode === "boolean" && !!prefObj.onlyNormalMode) {
		node.classList.add('if-normal-version');
	}

	let labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if (typeof prefObj.description === "string") {
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	if (prefObj.type !== "control") {
		labelNode.dataset.translateTitle = `${id}_description`;
	}

	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title;
	title.dataset.translateId = `${id}_title`;
	labelNode.appendChild(title);

	let prefNode = null,
		beforeInputNode = null,
		afterInputNode = null,
		output;
	switch(prefObj.type) {
		case "json":
			prefNode = document.createElement("textarea");
			prefNode.dataset.stringTextarea = true;
			prefNode.value = JSON.stringify(await getPreference(id));
			break;
		case "string":
			if(typeof prefObj.stringTextArea === "boolean" && prefObj.stringTextArea === true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringTextarea = true;
				prefNode.value = await getPreference(id);
			} else {
				prefNode = document.createElement("input");

				if(prefObj.hasOwnProperty("password") && prefObj.password===true){
					prefNode.type = "password";
				} else {
					prefNode.type = "text";
				}

				prefNode.value = await getPreference(id);
			}
			break;
		case "integer":

			prefNode = document.createElement("input");
			prefNode.required = true;
			if (typeof prefObj.rangeInput === "boolean" && prefObj.rangeInput === true && typeof prefObj.minValue === "number" && typeof prefObj.maxValue === "number") {
				prefNode.type = "range";
				prefNode.step = 1;

				output = document.createElement("output");
			} else {
				beforeInputNode = document.createElement("label");
				beforeInputNode.dataset.inputNumberControl = "moins";
				beforeInputNode.htmlFor = id;
				beforeInputNode.innerHTML = "<i class=\"material-icons\">remove_circle</i>";

				afterInputNode = document.createElement("label");
				afterInputNode.dataset.inputNumberControl = "plus";
				afterInputNode.htmlFor = id;
				afterInputNode.innerHTML = "<i class=\"material-icons\">add_circle</i>";

				prefNode.type = "number";
			}
			if(typeof prefObj.minValue === "number"){
				prefNode.min = prefObj.minValue;
			}
			if(typeof prefObj.maxValue === "number"){
				prefNode.max = prefObj.maxValue;
			}
			prefNode.value = parseInt(await getPreference(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			prefNode.checked = getBooleanFromVar(await getPreference(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			prefNode.value = await getPreference(id);
			break;
		case "control":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;
			break;
		case "file":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;

			beforeInputNode = document.createElement("output");
			beforeInputNode.id = id;
			const filePrefValue = await getPreference(id);
			if(filePrefValue!==null && typeof filePrefValue==="object" && filePrefValue.hasOwnProperty("name")){
				beforeInputNode.textContent = filePrefValue.name;
			}

			afterInputNode = document.createElement("button");
			afterInputNode.id = id;
			afterInputNode.dataset.settingType = prefObj.type;
			afterInputNode.dataset.action = "delete";
			afterInputNode.dataset.translateId = "Delete";
			break;
		case "menulist":
			if(Array.isArray(prefObj.options) && prefObj.options.length <= 5){
				prefNode = document.createElement("div");

				const currentValue = await getPreference(id);
				for(let o in prefObj.options){
					if(prefObj.options.hasOwnProperty(o)){
						let option = prefObj.options[o];

						let optionNode = document.createElement("input");
						optionNode.type = "radio";
						optionNode.id = option.label;
						optionNode.name = id;
						optionNode.value = option.value;
						optionNode.checked = option.value === currentValue;

						prefNode.appendChild(optionNode);

						let optionNodeLabel = document.createElement("label");
						optionNodeLabel.htmlFor = option.label;
						optionNodeLabel.textContent = option.label;
						optionNodeLabel.dataset.translateId = `${id}_${option.value}`;

						prefNode.appendChild(optionNodeLabel);
					}
				}
			} else {
				prefNode = document.createElement("select");
				prefNode.size = 5;

				for(let o in prefObj.options){
					if(prefObj.options.hasOwnProperty(o)){
						let option = prefObj.options[o];

						let optionNode = document.createElement("option");
						optionNode.text = option.label;
						optionNode.value = option.value;
						optionNode.dataset.translateId = `${id}_${option.value}`;

						prefNode.add(optionNode);
					}
				}

				prefNode.value = await getPreference(id);
			}
			break;
	}

	if (!prefNode) {
		throw new Error('UNKNOWN_TYPE');
	}

	prefNode.id = id;
	if (prefObj.type !== "control") {
		prefNode.classList.add("preferenceInput");
	}
	if (prefObj.type === "control" || prefObj.type === "file") {
		prefNode.dataset.translateId = `${id}`;
	}

	prefNode.dataset.settingType = prefObj.type;

	if (prefObj.type === "bool") {
		if (beforeInputNode !== null) {
			node.appendChild(beforeInputNode);
		}
		node.appendChild(prefNode);
		if(afterInputNode){
			node.appendChild(afterInputNode);
		}

		node.appendChild(labelNode);
	} else {
		node.appendChild(labelNode);

		if (beforeInputNode !== null) {
			node.appendChild(beforeInputNode);
		}
		node.appendChild(prefNode);
		if (afterInputNode) {
			node.appendChild(afterInputNode);
		}
	}

	let isPanelPage = parent.baseURI.indexOf("panel.html") !== -1;
	if (id.indexOf("_keys_list") !== -1 || (isPanelPage && id.indexOf("_user_id") !== -1) || (!isPanelPage && (id === "statusBlacklist" || id === "statusWhitelist" || id === "gameBlacklist" || id === "gameWhitelist"))) {
		node.classList.add("flex_input_text");
	}

	if (typeof prefNode.type === "string" && prefNode.type === "range") {
		output.textContent = `${prefNode.value}${((typeof prefObj.rangeOutputUnit==="string")? prefObj.rangeOutputUnit : "")}`;
		prefNode.addEventListener("change",function(){
			output.textContent = `${prefNode.value}${((typeof prefObj.rangeOutputUnit==="string")? prefObj.rangeOutputUnit : "")}`;
		});
		node.appendChild(output);
	}

	return node;
}

function sleep(millisecond) {
	return new Promise(resolve => {
		setTimeout(resolve, millisecond);
	})
}
/**
 *
 * @param {string} appName
 */
async function exportPreferencesToFile(appName="ztoolbox") {
	let exportData = {
		"preferences": await getSyncPreferences()
	};

	exportData[`${appName}_version`] = chrome.runtime.getManifest().version;



	const iframe = document.body.appendChild(document.createElement('iframe'));
	iframe.classList.add("hidden");

	let link = document.createElement("a");
	link.setAttribute("download", `${appName}_preferences.json`);

	const url = URL.createObjectURL(new Blob([
			JSON.stringify(exportData, null, null)
		], {type: 'application/json'}))
	;

	link.href = url;

	await sleep();
	link = iframe.contentDocument.importNode(link, true);
	iframe.contentDocument.body.appendChild(link);

	await sleep();
	link.dispatchEvent(new MouseEvent('click'));

	await sleep(1000);
	URL.revokeObjectURL(url);
	iframe.remove();
}

/**
 *
 * @param {Blob} blob
 * @param {boolean} readType
 * @return {Promise<string | ArrayBuffer>}
 */
function loadBlob(blob, readType=null) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("loadend", function() {
			resolve(reader.result);
		});
		reader.addEventListener("error", reject);

		if (readType === "text") {
			reader.readAsText(blob);
		} else {
			reader.readAsDataURL(blob);
		}
	})
}

/**
 *
 * @param {HTMLElement} node
 * @return {boolean}
 */
function simulateClick(node) {
	let evt = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		view: window,
	});
	// Return true is the event haven't been canceled
	return node.dispatchEvent(evt);
}

/**
 *
 * @param {Object=null} opts
 * @param {String=null} opts.readType
 * @param {Number=null} opts.fileMaxSize
 * @param {RegExp=null} opts.fileTypes
 * @param {String=null} opts.inputAccept
 * @return {Promise<FileList>}
 */
function importDataFormFiles(opts=null) {
	return new Promise((resolve, reject) => {
		if (opts === null && typeof opts !== "object") {
			reject("Wrong argument");
			return;
		}
		if (!opts.hasOwnProperty("readType")) {
			opts.readType = null
		}
		if (!opts.hasOwnProperty("fileMaxSize")) {
			opts.fileMaxSize = null
		}
		if (!opts.hasOwnProperty("fileTypes")) {
			opts.fileTypes = null
		}
		if (!opts.hasOwnProperty("inputAccept")) {
			opts.inputAccept = null
		}

		let node = document.createElement("input");
		node.type = "file";
		node.className = "hide";
		if (opts.inputAccept !== null) {
			node.accept = opts.inputAccept;
		}

		node.addEventListener("change", async function() {
			node.remove();

			if (typeof node.files !== "undefined") {
				let promiseList = [];
				for(let file of node.files) {
					if (opts.fileMaxSize !== null && file.size>opts.fileMaxSize) {
						promiseList.push({
							"error": "FileTooBig"
						});
					} else if(opts.fileTypes !== null && opts.fileTypes instanceof RegExp && !opts.fileTypes.test(file.type)){
						promiseList.push({
							"error": "WrongFileType"
						});
					} else {
						if (opts.readType !== null) {
							promiseList.push(loadBlob(file, opts.readType));
						} else {
							promiseList.push(loadBlob(file));
						}
					}
				}

				let dataObj = await Promise.allSettled(promiseList),
					outputData= []
				;

				for (let [index, settleData] of dataObj.entries()) {
					if (settleData.status === 'fulfilled' && typeof settleData.value === "string") {
						outputData[index] = {
							"name": node.files[index].name,
							"data": settleData.value
						};
					} else {
						outputData[index] = {
							"name": node.files[index].name,
							"error": (typeof settleData.reason === "object" && settleData.reason.hasOwnProperty("error")) ? settleData.reason.error : settleData.reason
						};
					}
				}

				resolve(outputData);
			} else {
				reject();
			}
		});

		document.head.appendChild(node);
		simulateClick(node);
	});
}

async function prefNode_FileType_onChange(event) {
	const options = await getPreferenceConfig(true),
		{target: prefNode} = event,
		settingName = prefNode.id,
		outputNode = prefNode.ownerDocument.querySelector(`output[id="${prefNode.id}"]`)
	;

	if (prefNode.dataset.action !== undefined && prefNode.dataset.action === "delete") {
		await savePreference(prefNode.id, options.get(prefNode.id)?.value);

		if (outputNode !== null) {
			outputNode.textContent = "";
		}
	} else {
		const prefObj = options.get(prefNode.id);

		let fileMaxSize = (prefObj.hasOwnProperty("fileMaxSize") && prefObj.fileMaxSize!=="null")? prefObj.fileMaxSize : null;
		if(typeof fileMaxSize==="string"){
			const number = parseInt(fileMaxSize);
			if(!isNaN(number)){
				fileMaxSize = number;
			}
		}

		let filesData = null;

		try {
			filesData = await importDataFormFiles({
				"fileMaxSize": fileMaxSize,
				"readType": (prefObj.hasOwnProperty("readType"))? prefObj.readType : "dataUrl",
				"fileTypes": (prefObj.hasOwnProperty("fileTypes") && prefObj.fileTypes instanceof RegExp)? prefObj.fileTypes : null,
				"inputAccept": (prefObj.hasOwnProperty("inputAccept"))? prefObj.inputAccept : null
			});
		} catch(e){
			console.warn(e);
		}

		if (filesData && Array.isArray(filesData) && filesData.length > 0) {
			if (filesData[0].hasOwnProperty("data")) {
				savePreference(settingName, filesData[0]);

				if (outputNode !== null) {
					outputNode.textContent =  filesData[0].name;
				}
			} else {
				const error = filesData[0].error;

				if (error === "WrongFileType" || error === "FileTooBig") {
					const errorMsg = document.createElement("span");
					errorMsg.classList.add("error");
					errorMsg.textContent = i18ex._(error);
					outputNode.appendChild(errorMsg);

					setTimeout(() => {
						errorMsg.remove();
					}, 2000);
				}
			}
		}
	}
}

/**
 *
 * @param {string} appName
 * @param {boolean} mergePreferences
 */
async function importPreferencesFromFile(appName, mergePreferences) {
	let files = await importDataFormFiles({
		"readType": "text"
	});console.dir(files)

	if (files.length === 0 || files.length > 1) {
		throw `[Input error] ${node.files.length} file(s) loaded`;
	}

	let file_JSONData = null;
	try {
		file_JSONData = JSON.parse(files[0].data);
	} catch (error) {
		if (error.message && error.message.indexOf("SyntaxError") !== -1) {
			throw `An error occurred when trying to parse file (Check the file you have used)`;
		} else {
			throw `An error occurred when trying to parse file (${error})`;
		}
	}
	if (file_JSONData !== null) {
		if (file_JSONData.hasOwnProperty(`${appName}_version`) && file_JSONData.hasOwnProperty("preferences") && typeof file_JSONData.preferences === "object") {
			await importFromJSON(file_JSONData.preferences, (typeof mergePreferences === "boolean") ? mergePreferences : false);
			return true;
		} else {
			throw `An error occurred when trying to parse file (Check the file you have used)`;
		}
	}
}
