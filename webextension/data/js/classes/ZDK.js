'use strict';

import { ChromeNotificationController } from './chrome-notification-controller.js';
import * as chromeUpdateNotification from './chromeUpdateNotification.js';
import { ChromePreferences } from './chrome-preferences.js';
import { i18extended } from './i18extended.js';
import { Queue } from './queue.js';
import { DataStore } from './data-store.js';
import { ZTimer } from './ztimer.js';
import { Version } from './version.js';
import { loadJS } from './loadJS.js';

export const noop = () => {};



class ZDK {
	constructor(addonJsRoot) {
		this.addonJsRoot = addonJsRoot;
	}


	/**
	 *
	 * @return {ChromeNotificationController}
	 * @constructor
	 */
	get ChromeNotificationController() {
		return ChromeNotificationController;
	}

	get chromeUpdateNotification() {
		return chromeUpdateNotification;
	}

	/**
	 *
	 * @return {ChromePreferences}
	 * @constructor
	 */
	get ChromePreferences() {
		return ChromePreferences;
	}

	/**
	 *
	 * @return {i18extended}
	 */
	get i18extended() {
		return i18extended;
	}

	/**
	 *
	 * @return {Queue}
	 * @constructor
	 */
	get Queue() {
		return Queue;
	}

	/**
	 *
	 * @return {DataStore}
	 * @constructor
	 */
	get DataStore() {
		return DataStore;
	}

	/**
	 *
	 * @return {ZTimer}
	 * @constructor
	 */
	get ZTimer() {
		return ZTimer;
	}

	get setTimeout() {
		return this.ZTimer.setTimeout;
	}

	get setInterval() {
		return this.ZTimer.setInterval;
	}

	/**
	 *
	 * @return {Version}
	 * @constructor
	 */
	get Version() {
		return Version;
	}



	/**
	 * Inspired on Underscore's memoize
	 * - With delay to fix memory leak
	 * - Map: Efficiency
	 * - async/await: Promises destined usage
	 * @param {function} fn - Function to memoize
	 * @param {number} [delay] - Delay, in milliseconds, to clean the cached data
	 * @param {function} [hasher]
	 * @returns {function} {memoize}
	 */
	static memoize (fn, delay, hasher) {
		let memoize = async function(key) {
			let cache = memoize.cache;
			const address = '' + (hasher ? hasher.apply(this, arguments) : Array.prototype.slice.call(arguments));
			if(cache.has(address)) {
				clearTimeout(cache.get(address).timer);
			} else {
				cache.set(address, {"data": await fn.apply(this, arguments) });
			}
			if(typeof delay==="number"&&!isNaN(delay)&&delay>0) cache.get(address).timer = window.setTimeout(()=>{ cache.delete(address ); }, delay);
			return cache.get(address).data;
		};
		memoize.cache = new Map();
		return memoize;
	};


	/**
	 * Console/Error catcher, avoid messages if not experimented user
	 * @return {Console}
	 */
	static get console() {
		if (this._console === undefined || this._console === null) {
			this._console = new Proxy(window.console, {
				get(target, p) {
					if (p !== 'log' && typeof this.hasOwnProperty(target, p) === false) {
						return this.get(target, 'log');
					}

					if (getPreference('showAdvanced') && getPreference('showExperimented')) {
						return window.console[p];
					} else {
						return noop;
					}
				}
			});
		}

		return this._console;
	}

	/**
	 *
	 * @param {string} title
	 * @return title
	 */
	customTitleForConsole(title) {
		return [`%c${title}`, 'background: #4676d7;border-radius:5px;padding:5px;margin:2px 5px 2px 0px']

	}

	/**
	 * Turns a Map into a JSON object
	 * @param {Map}  myMap
	 * @returns {Object}
	 */
	static mapToObj(myMap){
		if(myMap instanceof Map){
			let obj = {};
			myMap.forEach((value, index) => {
				obj[index] = (value instanceof Map)? ZDK.mapToObj(value) : value;
			});
			return obj;
		} else {
			throw 'myMap should be an Map';
		}
	}


	/**
	 * Ellipse str if the str string length is higher than strMaxLength
	 * @param {String} str
	 * @param {Number} strMaxLength Max string length wanted
	 * @returns {String} String of strMaxLength length or less
	 */
	static stringEllipse(str, strMaxLength) {
		if (typeof str !== "string" || typeof strMaxLength !== "number") {
			throw "Argument type problem";
		}
		if (str.length > strMaxLength) {
			return `${str.substring(0, strMaxLength - 3)}...`
		} else {
			return str;
		}
	}


	/**
	 *
	 * @param {Object} obj
	 * @returns {Promise<HTMLImageElement>}
	 */
	loadImage(obj={}){
		return new Promise((resolve, reject)=>{
			let imgNode;
			if(typeof obj === "object") {
				if(obj.tagName!==undefined && obj.naturalWidth && obj.naturalHeight){
					imgNode = obj;
				} else {
					imgNode = new Image();
					for(let id in obj){
						if(obj.hasOwnProperty(id)){
							imgNode[id] = obj[id];
						}
					}
				}
			} else if(typeof obj === "string") {
				imgNode = new Image();
				imgNode.src = obj;
			} else {
				imgNode = new Image();
				for(let i in obj){
					if(obj.hasOwnProperty(i)){
						imgNode[i] = obj[i];
					}
				}
			}

			if(imgNode.complete===true){
				resolve(imgNode);
			} else {
				const onLoad = ()=>{
					resolve(imgNode);
					imgNode.removeEventListener("load", onLoad);
				};
				imgNode.addEventListener("load", onLoad);
				imgNode.addEventListener("error", reject);
			}
		})
	}

	/**
	 *
	 * @param {Blob} blob
	 * @param {Boolean} readType
	 * @return {Promise}
	 */
	loadBlob(blob, readType=null){
		return new Promise((resolve, reject)=>{
			const reader = new FileReader();
			reader.addEventListener("loadend", function() {
				resolve(reader.result);
			});
			reader.addEventListener("error", reject);

			if(readType==="text"){
				reader.readAsText(blob);
			} else {
				reader.readAsDataURL(blob);
			}
		})
	}
	async getBase64Image(pictureNode, settings={}){
		if(typeof pictureNode.complete==="boolean" && pictureNode.naturalWidth && pictureNode.naturalHeight){
			try{
				await this.loadImage(pictureNode);
			} catch (err){
				console.warn(err)
			}

			const devicePixelDensity = (window.devicePixelRatio>1)? window.devicePixelRatio : 1;
			// Return base64 picture node loaded, and return a promise if not
			let canvas = document.createElement("canvas"),
				pictureRatio = pictureNode.naturalWidth / pictureNode.naturalHeight;

			if( // Allow picture sized generation of the data, in a "contain" mode, to not lose any part of the Image
				(settings.hasOwnProperty("height") && typeof settings.height==="number" && !isNaN(settings.height))
				||
				(settings.hasOwnProperty("width") && typeof settings.width==="number"&&!isNaN(settings.width))
			){
				let newHeight,
					newWidth;
				if((settings.hasOwnProperty("height")&&!settings.hasOwnProperty("width")) || settings.width > settings.height){
					newHeight = devicePixelDensity * settings.height;
					newWidth = devicePixelDensity * settings.height * pictureRatio;
				} else {
					newHeight = devicePixelDensity * settings.width / pictureRatio;
					newWidth = devicePixelDensity * settings.width;
				}
				canvas.height = newHeight;
				canvas.width = newWidth;

				let ctx = canvas.getContext("2d");
				ctx.drawImage(pictureNode, 0, 0, newWidth, newHeight);
			} else {
				canvas.width = pictureNode.naturalWidth;
				canvas.height = pictureNode.naturalHeight;
				let ctx = canvas.getContext("2d");
				ctx.drawImage(pictureNode, 0, 0);
			}
			return canvas;
		} else {
			throw "InvalidParameter";
		}
	}

	static async openTabIfNotExist(url) {
		this.console.log(url);

		const tabs = await browser.tabs.query({});

		let custom_url = url.toLowerCase().replace(/http(?:s)?:\/\/(?:www\.)?/i,'');
		for (let tab of tabs) {
			if (tab.url.toLowerCase().indexOf(custom_url) !== -1) { // Mean the url was already opened in a tab
				browser.tabs.highlight({tabs: tab.index}); // Show the already opened tab
				return true; // Return true to stop the function as the tab is already opened
			}
		}

		if (typeof browser.windows === 'undefined') {
			const browserWindows = await browser.windows.getAll({
				populate: false,
				windowTypes: ['normal']
			});

			// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
			if(browserWindows.length===0){
				await browser.windows.create({
					'focused': true,
					'type': 'normal',
					'url': url
				});
			} else{
				await browser.tabs.create({ 'url': url });
			}
		} else {
			await browser.tabs.create({ 'url': url });
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
	insertHtml(action, selector, html, doc=document) {
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
	appendTo(selector, html, doc=document) {
		return this.insertHtml('appendTo', selector, html, doc);
	}

	/**
	 *
	 * @param selector
	 * @param html
	 * @param {HTMLDocument|Document} doc
	 * @returns {null | HTMLElement[]}
	 */
	insertBefore(selector, html, doc=document) {
		return this.insertHtml('insertBefore', selector, html, doc);
	}

	/**
	 *
	 * @param {HTMLElement} node
	 */
	removeAllChildren(node) {
		// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
		while (node.hasChildNodes()) {
			node.removeChild(node.lastChild);
		}
	}

	/**
	 * Return the top and left position of a node, relative to the document
	 * @param node
	 * @return {{top: number, left: number}}
	 */
	static getOffset(node) {
		let x = 0,
			y = 0
		;
		while(node && !isNaN(node.offsetLeft) && !isNaN(node.offsetTop)){
			x += node.offsetLeft - node.scrollLeft;
			y += node.offsetTop - node.scrollTop;
			node = node.offsetParent;
		}
		return {
			"top": y,
			"left": x,
		};
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

	/**
	 *
	 * @param {Window=window} win
	 * @return {{height: number, width: number}}
	 */
	static getPageSize(win=window) {
		const doc = win.document;
		return {
			'height': win.innerHeight || doc.documentElement.clientHeight || doc.body.clientHeight,
			'width': win.innerWidth || doc.documentElement.clientWidth || doc.body.clientWidth
		}
	}

	/**
	 *
	 * @param {Window=window} win
	 * @return {boolean} Return true if window have ontouchstart event
	 */
	static hasTouch(win=window) {
		return win.hasOwnProperty('ontouchstart');
	}

	/**
	 *
	 * @param date
	 * @return {boolean}
	 */
	static isValidDate(date){
		return date instanceof Date && !isNaN(date.getTime())
	}

	static validDateOrNull(date){
		return ZDK.isValidDate(date)? date : null;
	}
}



export {
	ZDK
}