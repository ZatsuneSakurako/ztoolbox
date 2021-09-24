browser.contextMenus.removeAll();

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
export class ContextMenusController extends Map {
	constructor(){
		super();
	}

	_create(title, targetUrlPatterns, onClick, opts) {
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
			'onClick': onClick,
			'title': title,
			'targetUrlPatterns': targetUrlPatterns,
			'targetUrlPatterns_processed': targetUrlPatterns_processed
		};



		if (!opts || !opts.contexts || !Array.isArray(opts.contexts)) {
			throw 'MissingContext';
		}
		const contexts = opts.contexts.map(item => item.toUpperCase());

		const srcContexts = [];
		[
			'AUDIO',
			'IMAGE',
			'VIDEO'
		].forEach(type => {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				srcContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		});

		if (srcContexts.length > 0) {
			const contextMenuOpts = Object.assign({
				'enabled': true,
				'targetUrlPatterns': targetUrlPatterns_processed,
				'title': title,
				"id": Math.random().toString().substr(2)
			}, opts);
			contextMenuOpts.contexts = srcContexts;

			this.set(browser.contextMenus.create(contextMenuOpts), contextData);
		}



		const documentContexts = [];
		[
			'PAGE',
			'TAB'
		].forEach(type => {
			const index = contexts.indexOf(type);
			if (browser.contextMenus.ContextType.hasOwnProperty(type) && index !== -1) {
				documentContexts.push(browser.contextMenus.ContextType[type]);
				contexts.splice(index, 1);
			}
		});

		if (documentContexts.length > 0) {
			const contextMenuOpts = Object.assign({
				"documentUrlPatterns": targetUrlPatterns_processed,
				"enabled": true,
				"title": title,
				"id": Math.random().toString().substr(2)
			}, opts);
			contextMenuOpts.contexts = documentContexts;

			this.set(browser.contextMenus.create(contextMenuOpts), contextData);
		}



		if (contexts.length > 0) {
			console.warn(`UnsupportedContexts : ${contexts.join(', ')}`);
		}
	}

	create(title, targetUrlPatterns, onClick) {
		const pageTypeContexts = [];
		if (browser.contextMenus.ContextType.hasOwnProperty("PAGE")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.PAGE)
		}
		if (browser.contextMenus.ContextType.hasOwnProperty("TAB")) {
			pageTypeContexts.push(browser.contextMenus.ContextType.TAB)
		}

		return this._create(title, targetUrlPatterns, onClick, {
			'contexts': pageTypeContexts
		});
	}

	createImage(title, targetUrlPatterns, onClick) {
		return this._create(title, targetUrlPatterns, onClick, {
			'contexts': [
				'image'
			]
		});
	}
}

export const contextMenusController = new ContextMenusController();