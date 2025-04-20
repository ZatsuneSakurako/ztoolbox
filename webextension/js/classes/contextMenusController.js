/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
import {i18ex} from "../translation-api.js";

/**
 *
 * @return {Map<string, string>}
 */
function getBrowserSrcSupportedContexts() {
	/**
	 *
	 * @type {Map<string, string>}
	 */
	const srcContexts = new Map();
	for (const type of ['AUDIO', 'IMAGE', 'VIDEO']) {
		if (type in chrome.contextMenus.ContextType) {
			srcContexts.set(type, chrome.contextMenus.ContextType[type]);
		}
	}
	return srcContexts;
}
export const BROWSER_SRC_SUPPORTED_CONTEXTS = Object.freeze(getBrowserSrcSupportedContexts());

/**
 *
 * @return {Map<string, string>}
 */
function getBrowserDocumentSupportedContexts() {
	/**
	 *
	 * @type {Map<string, string>}
	 */
	const documentContexts = new Map();
	for (const type of ['PAGE', 'TAB']) {
		if (type in chrome.contextMenus.ContextType) {
			documentContexts.set(type, chrome.contextMenus.ContextType[type]);
		}
	}
	return documentContexts;
}
export const BROWSER_DOCUMENT_SUPPORTED_CONTEXTS = Object.freeze(getBrowserDocumentSupportedContexts());



export class ContextMenusController extends Map {
	static #waitInit = Promise.withResolvers();

	constructor(){
		super();
	}

	static get waitInit() {
		return this.#waitInit.promise;
	}


	/**
	 *
	 * @param {string} id
	 * @param {string} title
	 * @param {string[]} targetUrlPatterns
	 * @param {function(info:object, tab:Tab|undefined):void} onClick
	 * @param opts
	 * @private
	 */
	_create(id, title, targetUrlPatterns, onClick, opts) {
		if (!(chrome.contextMenus !== undefined && chrome.contextMenus !== null && typeof chrome.contextMenus.create === "function")) {
			return;
		}

		let targetUrlPatterns_processed = [];
		if (Array.isArray(targetUrlPatterns)) {
			targetUrlPatterns.forEach(url => {
				if (/https?:\/\/.*/.test(url)) {
					targetUrlPatterns_processed.push(url);
				} else {
					// noinspection HttpUrlsUsage
					targetUrlPatterns_processed.push('http://' + url);
					targetUrlPatterns_processed.push('https://' + url);
				}
			})
		} else {
			throw 'targetUrlPattern must be an array';
		}
		const contextData = {
			id,
			'onClick': onClick,
			'title': title,
			'targetUrlPatterns': targetUrlPatterns,
			'targetUrlPatterns_processed': targetUrlPatterns_processed,
			opts
		};



		if (!opts || !opts.contexts || !Array.isArray(opts.contexts)) {
			throw 'MissingContext';
		}

		const contexts = new Set(opts.contexts.map(item => item.toUpperCase()));

		let hasContext = false;
		for (let [type,] of BROWSER_SRC_SUPPORTED_CONTEXTS) {
			if (contexts.has(type)) {
				hasContext = true;
				contexts.delete(type);
			}
		}
		if (hasContext) {
			this.set(id + '_src_context', contextData);
		}


		hasContext = false;
		for (let [type,] of BROWSER_DOCUMENT_SUPPORTED_CONTEXTS) {
			if (contexts.has(type)) {
				hasContext = true;
				contexts.delete(type);
			}
		}
		if (hasContext) {
			this.set(id + '_doc_context', contextData);
		}

		if (contexts.size > 0) {
			console.warn(`UnsupportedContexts : ${[...contexts].join(', ')}`);
		}
	}

	/**
	 *
	 * @return {Promise<void>}
	 * @private
	 */
	async _createAll() {
		for (let [contextId, data] of contextMenusController) {
			const {id, opts, title, targetUrlPatterns_processed} = data,
				contexts = new Set(opts.contexts.map(item => item.toUpperCase()))
			;

			if (contextId.endsWith('_src_context')) {
				const srcContexts = [];
				for (let [type, contextName] of BROWSER_SRC_SUPPORTED_CONTEXTS) {
					if (contexts.has(type)) {
						srcContexts.push(contextName);
						contexts.delete(type);
					}
				}

				const contextMenuOpts = Object.assign({
					id,
					'enabled': true,
					'targetUrlPatterns': targetUrlPatterns_processed,
					'title': title
				}, opts);
				contextMenuOpts.contexts = srcContexts;

				await chrome.contextMenus.create(contextMenuOpts);
			} else if (contextId.endsWith('_doc_context')) {
				const documentContexts = [];

				for (let [type, contextName] of BROWSER_DOCUMENT_SUPPORTED_CONTEXTS) {
					if (contexts.has(type)) {
						documentContexts.push(contextName);
						contexts.delete(type);
					}
				}

				if (documentContexts.length > 0) {
					const contextMenuOpts = Object.assign({
						id,
						"documentUrlPatterns": targetUrlPatterns_processed,
						"enabled": true,
						"title": title
					}, opts);
					contextMenuOpts.contexts = documentContexts;

					await chrome.contextMenus.create(contextMenuOpts);
				}
			} else {
				throw new Error('UnexpectedId');
			}

			if (contexts.size > 0) {
				console.warn(`UnsupportedContexts : ${[...contexts].join(', ')}`);
			}
		}

		ContextMenusController.#waitInit.resolve();
	}

	create(id, title, targetUrlPatterns, onClick) {
		const pageTypeContexts = [...BROWSER_DOCUMENT_SUPPORTED_CONTEXTS.keys()];
		return this._create(id, title, targetUrlPatterns, onClick, {
			'contexts': pageTypeContexts
		});
	}

	createImage(id, title, targetUrlPatterns, onClick) {
		return this._create(id, title, targetUrlPatterns, onClick, {
			'contexts': [
				'image'
			]
		});
	}
}

export const contextMenusController = new ContextMenusController();
chrome.contextMenus.onClicked.addListener(function (info, tab) {
	for (let [, data] of contextMenusController) {
		if (info.menuItemId === data.id) {
			try {
				data.onClick(info, tab);
			} catch (e) {
				console.error(e);
			}
		}
	}
});

async function onStart_contextMenus() {
	await chrome.contextMenus.removeAll();
	await i18ex.loadingPromise;
	await contextMenusController._createAll();
}
chrome.runtime.onStartup.addListener(function () {
	onStart_contextMenus()
		.catch(console.error)
	;
});
chrome.runtime.onInstalled.addListener(function () {
	onStart_contextMenus()
		.catch(console.error)
	;
});
