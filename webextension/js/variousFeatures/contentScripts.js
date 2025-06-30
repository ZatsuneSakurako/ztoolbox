import {_userScriptsStateStoreKey, _userScriptsStoreKey} from "../constants.js";
import {contentStyles} from "./contentStyles.js";
import {getBasicNotificationOptions} from "./contentScripts/chrome-notification.js";
import {getUserscriptData, setUserscriptData, writeClipboard} from "../classes/chrome-native.js";
import {errorToString} from "../utils/errorToString.js";
import dateUtils from '../utils/dateUtils.js';
import {getPanelPorts} from "../panelPort.js";

// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
const znmDataApi = {
	async setValue(fileName, tab, [key, value]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		currentData[key] = value;
		await znmUserscriptApi.setData(fileName, tab, [currentData]);
	},
	async getValue(fileName, tab, [key, defaultValue]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		return currentData[key] ?? defaultValue;
	},
	async deleteValue(fileName, tab, [key]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		delete currentData[key];
		await znmUserscriptApi.setData(fileName, tab, [currentData]);
	},
	async listValues(fileName, tab) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		return Array.from(Object.keys(currentData));
	},
	async setValues(fileName, tab, [values]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		for (let [key, value] of Object.entries(values)) {
			currentData[key] = value;
		}
		await znmUserscriptApi.setData(fileName, tab, [currentData]);
	},
	async getValues(fileName, tab, [keysOrDefaults]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {},
			output = {}
		;
		if (Array.isArray(currentData)) {
			for (let key of keysOrDefaults) {
				output[key] = currentData[key];
			}
		} else {
			for (let [key, defaultValue] of Object.entries(keysOrDefaults)) {
				output[key] = currentData[key] ?? defaultValue;
			}
		}
		return output;
	},
	async deleteValues(fileName, tab, [keys]) {
		const currentData = (await znmUserscriptApi.getData(fileName)) ?? {};
		for (let key of keys) {
			if (key in currentData) {
				delete currentData[key];
			}
		}
		await znmUserscriptApi.setData(fileName, tab, [currentData]);
	},
};



// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
const znmUserscriptApi = {
	/**
	 * @typedef {object} DownloadOpts
	 * @property {string} url
	 * @property {string} name
	 * @property {boolean} [saveAs]
	 * @property {Dict<string>} [headers]
	 */
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param {[string|DownloadOpts, string|undefined, boolean|undefined]} data
	 * @returns {Promise<number>}
	 */
	async download(fileName, tab, data) {
		let opts = {};
		if (Array.isArray(data)) {
			const [optsOrUrl, name, saveAs] = data;
			if (optsOrUrl && typeof optsOrUrl === "object") {
				opts = optsOrUrl;
			} else {
				opts = {url: optsOrUrl, name, saveAs};
			}
		} else {
			throw new Error('INVALID_ARGUMENTS')
		}
		if (!opts.url || typeof opts.url !== 'string') throw new Error('INVALID URL');
		if (opts.name !== undefined && typeof opts.name !== 'string') throw new Error('INVALID NAME');

		return await chrome.downloads.download({
			url: opts.url,
			filename: opts.name,
			saveAs: opts.saveAs !== undefined ? !!opts.saveAs : undefined,
		});
	},
	/**
	 * @typedef {object} NotificationOpts
	 * @property {string} [text]
	 * @property {string} [title]
	 * @property {string} [image]
	 */
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param {[string|NotificationOpts, string|undefined, string|undefined, any]} data
	 * @returns {Promise<string>}
	 */
	async notification(fileName, tab, data) {
		let opts = {};
		if (Array.isArray(data)) {
			if (data.length === 2 && typeof data.at(0) === 'object') {
				throw new Error('UNSUPPORTED_ON_DONE_PARAMETER');
			}
			const [optsOrText, title, image, onclick] = data;
			if (optsOrText && typeof optsOrText === "object") {
				opts = optsOrText;
			} else {
				opts = {text: optsOrText, title, image, onclick};
			}
		} else {
			throw new Error('INVALID_ARGUMENTS')
		}
		if (opts.text === undefined || typeof opts.text !== 'string') throw new Error('INVALID TEXT');
		if (opts.title !== undefined && typeof opts.title !== 'string') throw new Error('INVALID TITLE');
		if (opts.image !== undefined && typeof opts.image !== 'string') throw new Error('INVALID IMAGE');
		if (opts.onclick !== undefined) throw new Error('UNSUPPORTED_ONCLICK_PARAMETER');

		return await chrome.notifications.create(getBasicNotificationOptions({
			title: opts.title ?? fileName,
			"message": opts.text,
			"iconUrl": opts.image,
		}));
	},
	/**
	 * @typedef {object} OpenInTabOpts
	 * @property {boolean} [active]
	 * @property {number} [insert]
	 * @property {boolean} [setParent]
	 * @property {boolean} [incognito]
	 * @property {boolean} [loadInBackground]
	 */
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param {[string, undefined | boolean | OpenInTabOpts ]} data
	 * @returns {Promise<boolean>}
	 */
	async openInTab(fileName, tab, data) {
		/**
		 *
		 * @type { OpenInTabOpts & { url?: string } }
		 */
		let opts = {};
		if (Array.isArray(data)) {
			const [url, loadInBackgroundOrOpts] = data;
			if (typeof loadInBackgroundOrOpts === "object" && loadInBackgroundOrOpts) {
				opts = {url, ...loadInBackgroundOrOpts};
			} else {
				opts = {url, loadInBackgroundOrOpts};
			}
		} else {
			throw new Error('INVALID_ARGUMENTS')
		}
		if (opts.url === undefined || typeof opts.url !== 'string') throw new Error('INVALID URL');
		if (opts.insert !== undefined && typeof opts.insert !== 'number') throw new Error('INVALID INSERT');
		// noinspection JSUnresolvedReference
		if (opts.setParent !== undefined) throw new Error('UNSUPPORTED_SET_PARENT_PARAMETER');
		// noinspection JSUnresolvedReference
		if (opts.incognito !== undefined) throw new Error('UNSUPPORTED_INCOGNITO_PARAMETER');
		return !!await chrome.tabs.create({
			url: opts.url,
			active: opts.loadInBackground !== undefined ? !opts.loadInBackground : undefined,
			index: opts.insert !== undefined ? opts.insert : undefined,
		});
	},
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param {[string, { type: 'text'|'html'|'rtf', mimetype: string } ]} data
	 * @returns {Promise<boolean>}
	 */
	async setClipboard(fileName, tab, data) {
		let opts = {};
		if (Array.isArray(data)) {
			const [clipboardData, info] = data;
			opts = {
				data: clipboardData,
				info
			};
		} else {
			throw new Error('INVALID_ARGUMENTS');
		}
		if (!opts.info?.type || typeof opts.info.type !== 'string') throw new Error('INVALID TYPE');
		if (opts.data === undefined) throw new Error('INVALID DATA');
		return await writeClipboard({
			[opts.info.type]: opts.data,
		});
	},

	/**
	 *
	 * @param {string} fileName
	 * @returns {Promise<Dict<any>>}
	 */
	async getData(fileName) {
		if (!fileName || typeof fileName !== 'string') {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error('INVALID FILE_NAME');
		}
		return await getUserscriptData(fileName);
	},
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param {[Dict<any>|null]} data
	 * @returns {Promise<boolean>}
	 */
	async setData(fileName, tab, data) {
		const [newData] = data;
		if (!fileName || typeof fileName !== 'string') {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(`INVALID FILE_NAME ${JSON.stringify(fileName)}`);
		}
		if (typeof newData !== 'object') {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error('INVALID DATA');
		}
		const result = await setUserscriptData(fileName, newData);
		try {
			const exceptTab = [];
			if (tab !== undefined) {
				exceptTab.push(tab.id);
			}
			await triggerUserScriptDataUpdated(fileName, newData ?? {}, new Set(exceptTab));
		} catch (error) {
			console.error(error);
		}
		return result;
	},
	...znmDataApi,

	/**
	 * @typedef {object} RegisterMenuCommand
	 * @property {number|string} [id]
	 * @property {string} [name]
	 * @property {string} [fileName]
	 * @property {string} [accessKey]
	 * @property {boolean} [autoClose]
	 * @property {string} [icon]
	 * @property {boolean} [iconOnly]
	 * @property {string} [title]
	 * @property {number} [order]
	 */
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param data
	 * @returns {Promise<number|string>}
	 */
	async registerMenuCommand(fileName, tab, data) {
		const [name, _accessKeyOrOptions, _options] = data;
		if (typeof name !== 'string') throw new Error('INVALID NAME');

		/**
		 * @type {RegisterMenuCommand}
		 */
		let options= {};
		if (typeof _accessKeyOrOptions === 'string') {
			if (_options && typeof _options !== 'object') {
				throw new Error('INVALID_OPTIONS');
			}
			options = _options ?? {};
			options.accessKey = _accessKeyOrOptions;
		} else if (typeof _accessKeyOrOptions === 'object') {
			options = _accessKeyOrOptions;
		} else if (_accessKeyOrOptions !== undefined) {
			throw new Error('INVALID_OPTIONS');
		}

		const menu_command_id = options.id ?? crypto.randomUUID();
		options.id = menu_command_id;
		options.name = name;
		options.fileName = fileName;

		const _contentStyles = await contentStyles,
			tabData = _contentStyles.tabData;

		const tabDataItem = tabData[tab.id.toString(36)];
		options.order = Object.keys(tabDataItem.menus).length;
		tabDataItem.menus[options.id] = options;
		_contentStyles.tabData = tabData;

		setTimeout(() => {
			const panelPorts = getPanelPorts();
			for (let panelPort of panelPorts) {
				panelPort.postMessage({
					id: 'main_has_userScriptUpdate',
					data: {
						tabId: tab.id,
						userScriptId: fileName,
						reason: 'registerMenuCommand',
					}
				});
			}
		});

		return menu_command_id;
	},

	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param { [string] } data
	 * @returns {Promise<void>}
	 */
	async unregisterMenuCommand(fileName, tab, data) {
		if (!Array.isArray(data) || !['string', 'number'].includes(typeof data.at(0))) throw new Error(`INVALID MENU_COMMAND_ID ${JSON.stringify(data.at(0))}`);
		if (!tab) throw new Error('INVALID TAB');

		const _contentStyles = await contentStyles,
			tabData = _contentStyles.tabData;

		const tabDataItem = tabData[tab.id.toString(36)];
		for (let menuId of data) {
			console.dir('removing in ' + menuId);
			delete tabDataItem.menus[menuId];
		}
		_contentStyles.tabData = tabData;

		setTimeout(() => {
			const panelPorts = getPanelPorts();
			for (let panelPort of panelPorts) {
				panelPort.postMessage({
					id: 'main_has_userScriptUpdate',
					data: {
						tabId: tab.id,
						userScriptId: fileName,
						reason: 'registerMenuCommand',
					}
				});
			}
		});
	},

	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param { [string, object|null] } data
	 * @returns {Promise<void>}
	 */
	async setTabData(fileName, tab, [key, value]) {
		const _contentStyles = await contentStyles,
			tabData = _contentStyles.tabData;

		if (!(tab.id.toString(36) in tabData)) {
			throw new Error(`Tab ${tab.id} not found in contentScripts tabData.`);
		}
		if (typeof key !== 'string') {
			throw new Error('INVALID_KEY');
		}
		tabData[tab.id.toString(36)].customData[key] = value;
		_contentStyles.tabData = tabData;
	},
	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param { [string] } data
	 * @returns {Promise<object|null>}
	 */
	async getTabData(fileName, tab, [key]) {
		const _contentStyles = await contentStyles,
			tabData = _contentStyles.tabData;
		if (typeof key !== 'string') {
			throw new Error('INVALID_KEY');
		}
		return tabData[tab.id.toString(36)].customData[key] ?? null;
	},

	async injectVariable(fileName, tab, [variableName, data]) {
		return await chrome.scripting.executeScript({
			target: {
				tabId: tab.id,
				allFrames: false
			},
			func: function setVariable(variableName, data) {
				// /!\ /!\ MAIN WORLD mode /!\ /!\
				if (variableName in window) {
					throw new Error('VARIABLE_ALREADY_EXISTS');
				}
				window[variableName] = JSON.parse(data);
				// /!\ /!\ MAIN WORLD mode /!\ /!\
			},
			args: [variableName, JSON.stringify(data)],
			"world": "MAIN",
		});
	},

	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @returns {Promise<(chrome.windows.Window & { currentTabTitle?: string, currentTabUrl?:string, tabCount?: number })[]>}
	 */
	async getWindows(fileName, tab) {
		const windows = await chrome.windows.getAll({
		   populate: true,
			windowTypes: ['normal'],
		});
		for (let win of windows) {
			const activeTab = win.tabs.find(tab => {
				return tab.active;
			});
			win.isCurrentTab = win.id === tab.windowId;
			win.currentTabTitle = activeTab.title;
			win.currentTabUrl = activeTab.url;
			win.tabCount = win.tabs.length;
			win.tabs = undefined;
		}
		return windows;
	},

	/**
	 *
	 * @param {string} fileName
	 * @param {chrome.tabs.Tab} tab
	 * @param { [{ windowId?: number, index?: number }] } data
	 * @returns {Promise<boolean>}
	 */
	async moveTab(fileName, tab, data) {
		const [mvTabOpts] = data;
		if (typeof mvTabOpts !== 'object') throw new Error('INVALID_OPTIONS');

		try {
			if (!mvTabOpts.windowId || isNaN(mvTabOpts.windowId)) {
				await chrome.windows.create({
					"tabId": tab.id
				})
					.catch(console.error)
				;
			} else {
				await chrome.tabs.move(tab.id, {
					"windowId": mvTabOpts.windowId,
					"index": -1
				})
					.catch(console.error)
				;
			}
			return true;
		} catch (error) {
			console.error(error);
			return false;
		}
	}
};


/**
 *
 * @param {string} fileName
 * @param {Dict<any>} newData
 * @param {Set<number>} [exceptTabs]
 * @returns {Promise<void>}
 */
async function triggerUserScriptDataUpdated(fileName, newData, exceptTabs) {
	const tabs = await chrome.tabs.query({
		windowType: 'normal'
	});
	for (let tab of tabs) {
		if (exceptTabs && exceptTabs.has(tab.id)) continue;
		await chrome.tabs.sendMessage(tab.id, {
			type: "userScriptEvent",
			target: fileName,
			eventName: 'dataUpdated',
			data: [newData],
		})
			.catch(console.error);
	}
}

/**
 *
 * @param {any} message
 * @param {chrome.runtime.MessageSender} sender
 * @param {(response?: any) => void} sendResponse
 */
function onUserScriptMessage(message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		sendResponse(null);
		return;
	}
	if (typeof message !== 'object' || !message) {
		sendResponse({
			isError: true,
			response: 'DATA_SHOULD_BE_AN_OBJECT',
		});
		return;
	}

	const success = (response) => {
		sendResponse({ isError: false, response });
	};
	const error = (error) => {
		sendResponse({ isError: true, response: errorToString(error) });
	};

	if (message.type in znmUserscriptApi) {
		try {
			const result = znmUserscriptApi[message.type](message.context.fileName, sender.tab, message.data, message.context);
			if (result instanceof Promise) {
				result
					.then(result => success(result))
					.catch((err) => {
						console.error(err);
						error(err);
					});
			}
		} catch (err) {
			console.error(err);
			error(err);
		}
		return;
	}

	try {
		if (message.type in console) {
			console[message.type](`[UserScript] ${message.type} from ${message.context.fileName} :`, ...message.data);
			success(true);
			return;
		}

		sendResponse({
			isError: true,
			response: 'NOT_FOUND',
		});
	} catch (e) {
		console.error(e);
		errorToString(e ?? new Error('UNKNOWN_ERROR'));
	}
}

function userScriptApiLoader(context, dateUtils) {
	chrome.runtime.sendMessage({ type: 'user_script_executed', userScriptsId: context.fileName }).catch(console.error);
	const call = async function userScriptApiCall() {
		const [callName, ...args] = arguments;
		const result = await chrome.runtime.sendMessage({
			type: callName,
			context: context,
			data: args,
		});
		if (!result) return result;
		if (typeof result !== 'object') {
			console.error(result);
			throw new Error('RESULT_SHOULD_BE_AN_OBJECT');
		}
		if (result.isError) throw new Error(result.response ?? result.error);
		return result.response;
	}

	/**
	 *
	 * @type {Dict<((eventName: string) => void)[]>}
	 */
	const listeners = {};
	if (chrome.runtime.onMessage) {
		chrome.runtime.onMessage.addListener(onMessage);
	} else {
		/**
		 * Firefox does not support chrome.runtime.onMessage
		 * @type {chrome.runtime.Port|null}
		 */
		let port = null;
		try {
			port = chrome.runtime.connect({
				name: 'user_script_port',
			});
			port.onMessage.addListener((message) => {
				onMessage(message, null);
			});
		} catch (e) {
			console.error(e);
		}
	}
	/**
	 *
	 * @param {any} request
	 * @param {chrome.runtime.MessageSender} sender
	 */
	function onMessage(request, sender) {
		if ((sender !== null && sender.id !== chrome.runtime.id) || request.type !== 'userScriptEvent') return;
		if (!(request.eventName in listeners) || request.target !== context.fileName) return;

		for (const listener of listeners[request.eventName]) {
			if (typeof listener !== 'function') continue;
			if (request.data === undefined) {
				listener();
				continue;
			}
			const arrData = Array.isArray(request.data) ? request.data : [request.data];
			listener(...(arrData ?? []));
		}
	}

	/**
	 *
	 * @type {ProxyHandler}
	 */
	const readOnlyProxy = {
		set(target, property) {
			throw new Error(`Cannot modify property ${property} of the target object (READ_ONLY)`);
		},
		defineProperty(target, property) {
			throw new Error(`Cannot define property ${property} of the target object (READ_ONLY)`);
		},
		deleteProperty: (target, property) => {
			throw new Error(`Cannot delete property ${property} of the target object (READ_ONLY)`);
		},
		preventExtensions: ()=> true,
	}

	// noinspection JSUnusedGlobalSymbols
	const znmApi = new Proxy({
		...context,
		date: dateUtils,
		on(eventName, listener) {
			if (!(eventName in listeners)) {
				listeners[eventName] = [];
			}
			listeners[eventName].push(listener);
		},
		off(eventName, listener) {
			if (!(eventName in listeners)) return;

			if (listener === undefined) {
				// if no listener specified, remove all listeners
				listeners[eventName] = [];
				return;
			}
			for (const [i, _listener] of listeners[eventName].entries()) {
				if (_listener === listener) {
					delete listeners[eventName][i];
				}
			}
		},
		async registerMenuCommand() {
			const [name, callback, ...args] = arguments;
			// Keep callback and does not send it to registerMenuCommand
			const menu_command_id = await call.call(this, 'registerMenuCommand', name, ...args);
			znmApi.on(`menuCommand-${menu_command_id}`, callback);
			return menu_command_id;
		},
		unregisterMenuCommand() {
			const [menu_command_id, ...args] = arguments;
			znmApi.off(`menuCommand-${menu_command_id}`);
			return call.call(this, 'unregisterMenuCommand', menu_command_id, ...args);
		},
		/**
		 *
		 * @param {string} css
		 * @return {CSSStyleSheet|null}
		 */
		addStyle(css) {
			try {
				const styleSheet = new CSSStyleSheet();
				styleSheet.replaceSync(css);
				document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
				return styleSheet;
			} catch (e) {
				console.error(e);
				call('error', `Error adding style ${e}`).catch(console.error);
				return null;
			}
		},
	}, {
		get(target, key) {
			const compatibilityKeys = /^(GM_|TM_)/;
			if (typeof key === 'string' && !(key in target) && compatibilityKeys.test(key)) {
				// Compatibility for Tampermonkey
				key = key.replace(compatibilityKeys, '');
			}
			if (key in target) return target[key];
			return function () {
				return call.call(this, key, ...arguments);
			}
		},
		...readOnlyProxy,
	});
	return znmApi;
}



/**
 *
 * @typedef {object} UserScript
 * @property {number} index
 * @property {string} name
 * @property {string} fileName
 * @property {boolean} enabled
 * @property {boolean} manual
 * @property {string} [icon]
 * @property {string[]} tags
 * @property {string} script
 * @property {chrome.userScripts.RunAt} [runAt]
 * @property {string[]} [grant]
 * @property {string[]} [match]
 * @property {string[]} [excludeMatches]
 * @property {string} [allFrames]
 * @property {chrome.userScripts.ExecutionWorld} [sandbox]
 */
class ContentScripts {
	/**
	 * @type {UserScript[] | null}
	 */
	#userScripts= null;
	/**
	 * @type {Dict<boolean> | null}
	 */
	#userScriptsStates= null;
	/**
	 *
	 * @type {((fileName: string, newData: Dict<any>) => void)[]}
	 */
	onUserScriptDataUpdatedCbList = [];

	/**
	 *
	 * @type {Map<number, chrome.runtime.Port>}
	 */
	#ports=new Map()

	/**
	 * @private
	 */
	constructor() {
		chrome.storage.onChanged.addListener((changes, areaName) => {
			this.#onStorageChange(changes, areaName);
		});
		chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
			if (sender.id !== chrome.runtime.id) return;

			if (message && typeof message === 'object' && message.type === 'user_script_executed') {
				try {
					const tabData = this.#contentStyle.tabData,
						currentTabData = tabData[sender.tab.id.toString(36)];

					(currentTabData.executedScripts ?? []).push(message.userScriptsId);
					this.#contentStyle.tabData = tabData;

					sendResponse(true);
				} catch (e) {
					console.error(e);
					sendResponse(null);
				}

				const panelPorts = getPanelPorts();
				for (let panelPort of panelPorts) {
					panelPort.postMessage({
						id: 'main_has_userScriptUpdate',
						data: {
							tabId: sender.tab.id,
							userScriptId: message.userScriptsId,
							reason: 'executed',
						}
					});
				}
			} else {
				onUserScriptMessage(message, sender, sendResponse);
			}
		});
		chrome.runtime.onUserScriptConnect.addListener((port) => {
			if (!port.sender.tab) {
				port.disconnect();
				return;
			}

			const oldPort = this.#ports.get(port.sender.tab.id);
			if (oldPort) {
				console.log('[UserScript] Port already connected on ' + port.sender.tab.id);
				oldPort.disconnect();
			}
			this.#ports.set(port.sender.tab.id, port);
			port.onDisconnect.addListener((port) => {
				this.#ports.delete(port.sender.tab.id);
			});
		});
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (!message || typeof message !== 'object' || sender.id !== chrome.runtime.id) return;

			const wrapPromise = (promise) => {
				promise.then(result => {
					sendResponse({ error: false, data: result });
				})
					.catch(e => {
						console.error(e);
						sendResponse({ error: true });
					})
			}
			if (message.id === 'userscript_manual_execute') {
				if ((message.data.tabId ?? null) === null) {
					sendResponse({ error: 'TAB_ID_MISSING' });
					return;
				}
				const userScript = this.#userScripts.find(userScript => userScript.fileName === message.data.target);
				if (!userScript) {
					sendResponse({ error: 'USERSCRIPT_NOT_FOUND' });
					return;
				}

				wrapPromise(this.#manuallyExecute(userScript, message.data.tabId));
			} else if (message.id === 'user_script_panel_event') {
				const port = this.#ports.get(message.data.tabId);
				if (port !== undefined) {
					// If "saved" port connected (Firefox does not support chrome.runtime.onMessage version)
					try {
						port.postMessage({
							type: "userScriptEvent",
							target: message.data.target,
							eventName: message.data.eventName,
						});
						sendResponse({ error: false });
					} catch (e) {
						console.error(e);
						sendResponse({ error: true });
					}
				} else {
					wrapPromise(chrome.tabs.sendMessage(message.data.tabId, {
						type: "userScriptEvent",
						target: message.data.target,
						eventName: message.data.eventName,
					}));
				}
			}
		});
		chrome.webNavigation.onBeforeNavigate.addListener(async function (details) {
			// Exclude iframes
			if (details.tabId < 0 || details.frameId !== 0) return;
			try {
				// console.info('[UserScripts] Tab navigation, resetting', details);
				const _contentStyles = await contentStyles,
					tabId = details.tabId,
					tabData = _contentStyles.tabData;

				if (!(tabId.toString(36) in tabData)) {
					console.warn(`Tab ${tabId} was not found in contentScripts tabData.`);
					tabData[tabId.toString(36)] = _contentStyles.tabNewData;
				}
				tabData[tabId.toString(36)].executedScripts = [];
				tabData[tabId.toString(36)].menus = {};
				tabData[tabId.toString(36)].customData = {};

				const injectedFromTabStyles = new Set(tabData[tabId.toString(36)].injectedFromTabStyles ?? []);
				tabData[tabId.toString(36)].injectedStyles = tabData[tabId.toString(36)].injectedStyles
					.filter(injectedStyle => !injectedFromTabStyles.has(injectedStyle))
				tabData[tabId.toString(36)].injectedFromTabStyles = [];

				_contentStyles.tabData = tabData;
			} catch (e) {
				console.error(e);
			}
		});
		this.onUserScriptDataUpdatedCbList.push(triggerUserScriptDataUpdated);
	}

	// noinspection SpellCheckingInspection
	/**
	 * @type {ContentScripts}
	 */
	static #instance;
	/**
	 @type {ContentStyles}
	 */
	#contentStyle;
	/**
	 * @return {ContentScripts}
	 */
	static get instance() {
		return this.#instance;
	}
	/**
	 *
	 * @returns {Promise<ContentScripts>}
	 */
	static async load() {
		this.#instance = new ContentScripts();
		await this.#instance.load();
		this.#instance.#contentStyle = await contentStyles;
		return this.#instance;
	}
	async load() {
		if (!this.#userScriptsStates) {
			const result = await chrome.storage.session.get(_userScriptsStateStoreKey)
				.catch(console.error);
			if (!(_userScriptsStateStoreKey in result)) {
				this.#userScriptsStates = {};
			} else {
				if (!result || typeof result !== 'object') throw new Error('userScripts must be an object');
				this.#userScriptsStates = result[_userScriptsStateStoreKey];
			}

		}
	}



	/**
	 *
	 * @param {UserScript[]} newValue
	 */
	set userScripts(newValue)  {
		if (!Array.isArray(newValue)) throw new Error('ARRAY_VALUE_EXPECTED');
		this.#userScripts = newValue;
		chrome.storage.session.set({
			[_userScriptsStoreKey]: newValue
		})
			.catch(console.error);
	}
	/**
	 *
	 * @returns {UserScript[]}
	 */
	get userScripts()  {
		if (!this.#userScripts) {
			throw new Error('USER_SCRIPT_NOT_LOADED');
		}
		return this.#userScripts;
	}

	/**
	 *
	 * @param {Dict<boolean>} newValue
	 */
	set userScriptStates(newValue)  {
		this.#userScriptsStates = newValue;
		chrome.storage.session.set({
			[_userScriptsStateStoreKey]: newValue,
		})
			.catch(console.error);
	}
	/**
	 *
	 * @return {Dict<boolean>}
	 */
	get userScriptStates()  {
		if (!this.#userScriptsStates) {
			throw new Error('USER_SCRIPTS_STATES_NOT_LOADED');
		}
		return this.#userScriptsStates;
	}



	/**
	 *
	 * @param {Dict<chrome.storage.StorageChange>} changes
	 * @param {chrome.storage.AreaName} areaName
	 */
	#onStorageChange(changes, areaName) {
		if (areaName !== 'session') return;

		if (_userScriptsStoreKey in changes) {
			/**
			 * @type {UserScript[]}
			 */
			this.#userScripts = changes[_userScriptsStoreKey].newValue;
			this.#updateUserScripts()
				.catch(console.error);
		} else if (_userScriptsStateStoreKey in changes) {
			this.#userScriptsStates = changes[_userScriptsStateStoreKey].newValue;
			this.#updateUserScripts()
				.catch(console.error);
		}
	}

	/**
	 *
	 * @param {UserScript} userScript
	 * @return {chrome.userScripts.RegisteredUserScript}
	 */
	#userScriptToRegistrationOptions(userScript) {
		const uniqSuffix = self.crypto.randomUUID().replaceAll('-', '');
		const context = {
			fileName: userScript.fileName,
			tags: userScript.tags,
		};

		let specialScripts = new Map();
		for (let grant of userScript.grant ?? []) {
			if (['none', 'unsafeWindow'].includes(grant)) continue;
			specialScripts.set(grant, `function ${grant}() { return znmApi_${uniqSuffix}[${JSON.stringify(grant)}].apply(this, arguments); }`);
		}
		const additionalParams = !specialScripts.size ? ''
			: ', ' + Array.from(specialScripts.keys()).join(', ');
		const additionalValues = !specialScripts.size ? ''
			: ', ' + Array.from(specialScripts.values()).join(', ');

		const dateUtilsString= `{
	"monthNames": ${JSON.stringify(dateUtils.monthNames)},
	"monthNames2": ${JSON.stringify(dateUtils.monthNames2)},
	${dateUtils.parse.toString()},
	${dateUtils.format.toString()},
}`;
		/**
		 *
		 * @type {chrome.userScripts.RegisteredUserScript}
		 */
		const registrationUserScript = {
			id: userScript.fileName,
			runAt: userScript.runAt? userScript.runAt.replace(/-/g, '_') : undefined,
			js: [
				{ code: `'use strict';const znmApi_${uniqSuffix} = ${userScriptApiLoader.toString()}(${JSON.stringify(context)}, ${dateUtilsString});\n(function(znmApi, unsafeWindow, window${additionalParams}){ ${userScript.script} }).call(znmApi_${uniqSuffix}, znmApi_${uniqSuffix}, window, undefined${additionalValues});` },
			],
			matches: userScript.match ?? [],
			excludeMatches: userScript.excludeMatches ?? [],
			// NO chrome.runtime.* access in "MAIN" world as it's not isolated anymore
			world: 'USER_SCRIPT',
			allFrames: !!userScript.allFrames,
		};
		if (userScript.sandbox === 'MAIN') {
			// Exclude "znmApi" if running in MAIN world
			registrationUserScript.world = userScript.sandbox;
			registrationUserScript.js = [
				{ code: userScript.script }
			];
		}

		return registrationUserScript;
	}

	/**
	 *
	 * @param {UserScript} userScript
	 * @param {string} tabId
	 * @returns {Promise<any[]>}
	 */
	async #manuallyExecute(userScript, tabId) {
		const tab = await chrome.tabs.get(tabId);
		const registrationOptions = this.#userScriptToRegistrationOptions(userScript);
		return await chrome.userScripts.execute({
			injectImmediately: true,
			target: {
				tabId,
				allFrames: registrationOptions.allFrames,
			},
			js: registrationOptions.js,
			world: registrationOptions.world,
		});
	}

	async #updateUserScripts() {
		const userScripts = this.userScripts;

		const currentUserScripts = new Set(
			(await chrome.userScripts.getScripts())
				.map(userScript => userScript.id)
		);

		/**
		 *
		 * @type {Set<string>}
		 */
		const userScriptIds = new Set();

		/**
		 *
		 * @type {chrome.userScripts.RegisteredUserScript[]}
		 */
		const userScriptRegistration = [];
		/**
		 *
		 * @type {chrome.userScripts.RegisteredUserScript[]}
		 */
		const newUserScriptRegistration = [];

		for (let userScript of userScripts) {
			const enabled = this.userScriptStates[userScript.fileName] ?? userScript.enabled;
			if (!enabled) continue;
			userScriptIds.add(userScript.fileName);

			const registrationUserScript = this.#userScriptToRegistrationOptions(userScript);
			if (currentUserScripts.has(userScript.fileName)) {
				userScriptRegistration.push(registrationUserScript);
			} else {
				newUserScriptRegistration.push(registrationUserScript);
			}
		}


		if (newUserScriptRegistration.length > 0) {
			await chrome.userScripts.register(newUserScriptRegistration)
				.catch(console.error);
		}
		await chrome.userScripts.update(userScriptRegistration)
			.catch(console.error);


		/**
		 *
		 * @type {Set<string>}
		 */
		const removedUserScriptIds = new Set();
		for (let userScriptId of currentUserScripts) {
			if (!userScriptIds.has(userScriptId)) {
				removedUserScriptIds.add(userScriptId);
			}
		}
		if (removedUserScriptIds.size > 0) {
			await chrome.userScripts.unregister({
				ids: Array.from(removedUserScriptIds),
			}).catch(console.error);
		}


		console.log('[UserScript] Now registered UserScripts', await chrome.userScripts.getScripts());
	}
}

/**
 *
 * @type {ContentScripts|Promise<ContentScripts>}
 */
export let contentScripts = ContentScripts.load();


async function onStart() {
	await chrome.userScripts.configureWorld({
		messaging: true,
	})
		.catch(console.error);
}
chrome.runtime.onStartup.addListener(function () {
	onStart().catch(console.error);
});
chrome.runtime.onInstalled.addListener(function () {
	onStart().catch(console.error);
});
