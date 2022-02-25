/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
import {i18ex} from "./translation-api.js";

export class ContextMenusController extends Map {
	constructor(){
		super();
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
		/*if(browser.menu!==undefined && browser.menu !== null){
			// tools_menu is available with it
			console.info("browser.menu available");
		}*/
		if (!(browser.contextMenus !== undefined && browser.contextMenus !== null && typeof browser.contextMenus.create === "function")) {
			return;
		}

		let targetUrlPatterns_processed = [];
		if (Array.isArray(targetUrlPatterns)) {
			targetUrlPatterns.forEach(url => {
				if (/https?:\/\/.*/.test(url)) {
					targetUrlPatterns_processed.push(url);
				} else {
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
		const contexts = opts.contexts.map(item => item.toUpperCase());

		const srcContexts = [];
		for (const type of ['AUDIO', 'IMAGE', 'VIDEO']) {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				srcContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		}

		if (srcContexts.length > 0) {
			this.set(id + '_src_context', contextData);
		}



		const documentContexts = [];
		for (const type of ['PAGE', 'TAB']) {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				documentContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		}

		if (documentContexts.length > 0) {
			this.set(id + '_doc_context', contextData);
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
				contexts = opts.contexts.map(item => item.toUpperCase())
			;

			if (contextId.endsWith('_src_context')) {
				const srcContexts = [];
				for (const type of ['AUDIO', 'IMAGE', 'VIDEO']) {
					const index = contexts.indexOf(type);
					if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
						srcContexts.push(browser.contextMenus.ContextType[type]);
						contexts.splice(index, 1);
					}
				}

				const contextMenuOpts = Object.assign({
					id,
					'enabled': true,
					'targetUrlPatterns': targetUrlPatterns_processed,
					'title': title
				}, opts);
				contextMenuOpts.contexts = srcContexts;

				await browser.contextMenus.create(contextMenuOpts);
			} else if (contextId.endsWith('_doc_context')) {
				const documentContexts = [];
				for (const type of ['PAGE', 'TAB']) {
					const index = contexts.indexOf(type);
					if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
						documentContexts.push(browser.contextMenus.ContextType[type]);
						contexts.splice(index, 1);
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

					await browser.contextMenus.create(contextMenuOpts);
				}
			} else {
				throw new Error('UnexpectedId');
			}

			if (contexts.length > 0) {
				console.warn(`UnsupportedContexts : ${contexts.join(', ')}`);
			}
		}
	}

	create(id, title, targetUrlPatterns, onClick) {
		const pageTypeContexts = [];
		if (browser.contextMenus.ContextType.hasOwnProperty("PAGE")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.PAGE)
		}
		if (browser.contextMenus.ContextType.hasOwnProperty("TAB")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.TAB)
		}

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
	await browser.contextMenus.removeAll();
	await i18ex.loadingPromise;
	await contextMenusController._createAll();

	if (self.lstu_onStart_contextMenus) {
		lstu_onStart_contextMenus();
	}
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
