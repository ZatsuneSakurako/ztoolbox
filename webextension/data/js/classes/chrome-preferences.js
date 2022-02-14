import {ZDK} from './ZDK.js';
import {
	CHROME_PREFERENCES_SYNC_ID,
	CHROME_PREFERENCES_UPDATED_ID,
	getBooleanFromVar,
	getPreferenceConfig, savePreference, getPreference
} from './chrome-preferences-2.js';



/*		---- get/save preference ----		*/
function decodeString(string) {
	if (typeof string !== "string") {
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}

export function getFilterListFromPreference(string) {
	if (typeof string !== "string") {
		console.warn("Type error");
		string = "";
	}
	let list = string.split(",");
	for (let i in list) {
		if(list.hasOwnProperty(i)) {
			if (list[i].length === 0) {
				delete list[i];
				// Keep a null item, but this null is not considered in for..in loops
			} else {
				list[i] = decodeString(list[i]);
			}
		}
	}
	return list;
}

/**
 *
 * @param {HTMLInputElement} node
 * @return {void|string|boolean|number}
 */
export function getValueFromNode(node) {
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
		} else if (node.dataset.stringList === "true") {
			// Split as list, encode item, then make it back a string
			return node.value.split("\n").map(encodeString).join(",");
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

export const ChromePreferences = Object.freeze({
	async getSyncPreferences() {
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
	},

	getSyncKeys() {
		const options = getPreferenceConfig(true);

		let keysArray = [];
		for (const [prefId, ] of options) {
			if (option.hasOwnProperty("sync") === true && option.sync === true) {
				keysArray.push(prefId);
			}
		}

		return keysArray;
	},

	/**
	 *
	 * @param {JSON} preferences
	 * @param {Boolean=false} mergePreferences
	 */
	async importFromJSON(preferences, mergePreferences=false) {
		const options = getPreferenceConfig(true);

		for (let prefId in preferences) {
			if (!preferences.hasOwnProperty(prefId)){
				continue;
			}

			if (options.has(prefId) && typeof options.get(prefId).type !== "undefined" && options.get(prefId).type !== "control" && options.get(prefId).type !== "file" && typeof preferences[prefId] === typeof defaultSettingsSync.get(prefId)) {
				if(mergePreferences){
					await savePreference(prefId, preferences[prefId]);
				} else {
					await savePreference(prefId, preferences[prefId]);
				}
			} else {
				console.warn(`Error trying to import ${prefId}`);
			}
		}
	},
	async saveInSync() {
		return browser.storage.sync.set(await ChromePreferences.getSyncPreferences());
	},
	async restaureFromSync(mergePreferences=false){
		const items = await browser.storage.sync.get(ChromePreferences.getSyncKeys());
		for (let prefId in items) {
			if(items.hasOwnProperty(prefId)){
				if(mergePreferences){
					savePreference(prefId, items[prefId]);
				} else {
					savePreference(prefId, items[prefId]);
				}
			}
		}
		return "success";
	},


	/**
	 *
	 * @param {HTMLElement} container
	 */
	async loadPreferencesNodes(container) {
		const doc = container.ownerDocument,
			isPanelPage = container.baseURI.indexOf("panel.html") !== -1,
			body = doc.querySelector("body")
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
				if(await getPreference("showAdvanced")) {
					body.classList.add("showAdvanced");
				} else {
					body.classList.remove("showAdvanced");
				}
			}
			if (id === "showExperimented") {
				if(await getPreference("showExperimented")) {
					body.classList.add("showExperimented");
				} else {
					body.classList.remove("showExperimented");
				}
			}

			if(isPanelPage && ((typeof option.prefLevel === "string" && option.prefLevel === "experimented") || (option.hasOwnProperty("showPrefInPanel") && typeof option.showPrefInPanel === "boolean" && option.showPrefInPanel === false))){
				continue;
			}

			let groupNode = null;
			if (typeof option.group === "string" && option.group !== "") {
				const groupId = option.group;
				groupNode = doc.querySelector(`#${groupId}.pref_group`);

				if (groupNode === null) {
					groupNode = doc.createElement("div");
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

			groupNode.appendChild(await ChromePreferences.newPreferenceNode(groupNode, id));
		}
	},

	/**
	 *
	 * @param {HTMLElement} parent
	 * @param {String} id
	 * @return {HTMLDivElement}
	 */
	async newPreferenceNode(parent, id){
		const options = getPreferenceConfig(true),
			prefObj = options.get(id)
		;

		let node = document.createElement("div");
		node.classList.add("preferenceContainer");
		node.classList.add("preferenceContainer--" + id);
		if(typeof prefObj.prefLevel === "string"){
			node.classList.add(prefObj.prefLevel);
		}

		let labelNode = document.createElement("label");
		labelNode.classList.add("preference");
		if(typeof prefObj.description === "string"){
			labelNode.title = prefObj.description;
		}
		labelNode.htmlFor = id;
		if(prefObj.type !== "control"){
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
				} else if(typeof prefObj.stringList === "boolean" && prefObj.stringList === true){
					prefNode = document.createElement("textarea");
					prefNode.dataset.stringList = true;
					prefNode.value = getFilterListFromPreference(await getPreference(id)).join("\n");

					node.classList.add("stringList");
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
	},

	/**
	 *
	 * @param {string} appName
	 */
	async exportPrefsToFile(appName) {
		let exportData = {
			"preferences": await ChromePreferences.getSyncPreferences()
		};

		exportData[`${appName}_version`] = browser.runtime.getManifest().version;



		const iframe = document.body.appendChild(document.createElement('iframe'));
		iframe.classList.add("hidden");

		let link = document.createElement("a");
		link.setAttribute("download", `${appName}_preferences.json`);

		const url = URL.createObjectURL(new Blob([
				JSON.stringify(exportData, null, null)
			], {type: 'application/json'}))
		;

		link.href = url;

		await ZDK.setTimeout();
		link = iframe.contentDocument.importNode(link, true);
		iframe.contentDocument.body.appendChild(link);

		await ZDK.setTimeout();
		link.dispatchEvent(new MouseEvent('click'));

		await ZDK.setTimeout(1000);
		URL.revokeObjectURL(url);
		iframe.remove();
	},

	/**
	 *
	 * @param {Object=null} opts
	 * @param {String=null} opts.readType
	 * @param {Number=null} opts.fileMaxSize
	 * @param {RegExp=null} opts.fileTypes
	 * @param {String=null} opts.inputAccept
	 * @return {Promise<FileList>}
	 */
	importDataFormFiles(opts=null) {
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

			let node = doc.createElement("input");
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
								promiseList.push(ZDK.loadBlob(file, opts.readType));
							} else {
								promiseList.push(ZDK.loadBlob(file));
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

			doc.head.appendChild(node);
			ZDK.simulateClick(node);
		});
	},

	async prefNode_FileType_onChange(event) {
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
				filesData = await ChromePreferences.importDataFormFiles({
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
	},

	/**
	 *
	 * @param {string} appName
	 * @param {boolean} mergePreferences
	 */
	async importPrefsFromFile(appName, mergePreferences) {
		let files = await ChromePreferences.importDataFormFiles({
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
				await ChromePreferences.importFromJSON(file_JSONData.preferences, (typeof mergePreferences === "boolean") ? mergePreferences : false);
				return true;
			} else {
				throw `An error occurred when trying to parse file (Check the file you have used)`;
			}
		}
	}
});



export {
	CHROME_PREFERENCES_SYNC_ID,
	CHROME_PREFERENCES_UPDATED_ID,
} from './chrome-preferences-2.js';
