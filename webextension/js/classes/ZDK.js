'use strict';

export class ZDK {
	/**
	 *
	 * @param {string} title
	 * @return title
	 */
	static customTitleForConsole(title) {
		return [`%c${title}`, 'background: #4676d7;border-radius:5px;padding:5px;margin:2px 5px 2px 0px'];
	}

	/**
	 *
	 * @param {Blob} blob
	 * @param {Boolean} readType
	 * @return {Promise}
	 */
	static loadBlob(blob, readType=null){
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
	 * @param {string} url
	 * @return {Promise<boolean>}
	 */
	static async openTabIfNotExist(url) {
		console.log(url);

		const tabs = await chrome.tabs.query({});

		let custom_url = url.toLowerCase().replace(/https?:\/\/(?:www\.)?/i,'');
		for (let tab of tabs) {
			if (tab.url.toLowerCase().indexOf(custom_url) !== -1) { // Mean the url was already opened in a tab
				chrome.tabs.highlight({tabs: tab.index}); // Show the already opened tab
				return true; // Return true to stop the function as the tab is already opened
			}
		}

		if (typeof chrome.windows === 'undefined') {
			const browserWindows = await chrome.windows.getAll({
				populate: false,
				windowTypes: ['normal']
			});

			// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
			if(browserWindows.length===0){
				await chrome.windows.create({
					'focused': true,
					'type': 'normal',
					'url': url
				});
			} else{
				await chrome.tabs.create({ 'url': url });
			}
		} else {
			await chrome.tabs.create({ 'url': url });
		}

		return false; // Return false because the url wasn't already in a tab
	}

	/**
	 *
	 * @param action
	 * @param selector
	 * @param html
	 * @param {HTMLDocument|Document} doc
	 * @returns {null | HTMLElement[]}
	 */
	static insertHtml(action, selector, html, doc=document) {
		if (typeof action !== 'string' || action === '') {
			throw 'Wrong action';
		}

		const nodes = (typeof html === 'object')? [html] : new DOMParser().parseFromString(html, 'text/html').body.childNodes,
			target = (typeof selector === 'object')? selector : doc.querySelector(selector),
			output = []
		;
		if (target!==null) {
			for (let i in nodes) {
				if (nodes.hasOwnProperty(i)) {
					const node = nodes[i];
					switch(action) {
						case 'appendTo':
							output[i] = target.appendChild(node);
							break;
						case 'insertBefore':
							output[i] = target.parentNode.insertBefore(node, target);
							break;
					}
				}
			}
			return output;
		} else {
			return null;
		}
	}

	/**
	 * @param selector
	 * @param html
	 * @param {HTMLDocument|Document} doc
	 * @returns {null | HTMLElement[]}
	 */
	static appendTo(selector, html, doc=document) {
		return this.insertHtml('appendTo', selector, html, doc);
	}

	/**
	 *
	 * @param selector
	 * @param html
	 * @param {HTMLDocument|Document} doc
	 * @returns {null | HTMLElement[]}
	 */
	static insertBefore(selector, html, doc=document) {
		return this.insertHtml('insertBefore', selector, html, doc);
	}

	static simulateClick(node) {
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
	 * @param {Number} millisecond
	 * @return {Promise<void>}
	 */
	static setTimeout(millisecond) {
		return new Promise(resolve=>{
			setTimeout(resolve, millisecond);
		})
	}
}
