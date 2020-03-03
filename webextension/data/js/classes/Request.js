'use strict';
import { ZDK } from './ZDK.js';



/**
 *
 * @param {XMLHttpRequestEventTarget } object
 * @param {string} eventName
 * @return {Promise<ProgressEvent<XMLHttpRequestEventTarget>>}
 */
function waitEvent(object, eventName) {
	return new Promise(resolve => {
		object.addEventListener(eventName, function listener(event) {
			object.removeEventListener(eventName, listener);
			resolve(event);
		});
	})
}

/**
 *
 * @private
 * @param {CustomRequestOptions} options
 * @param {string} method
 * @returns {Promise<Object>}
 */
async function _core(options, method) {
	const xhr = new XMLHttpRequest();

	const urlObj = new URL(options.url),
		params = (method !== 'GET')? new URLSearchParams() : undefined
	;

	options.content.forEach((value, name) => {
		if (method === 'GET') {
			// Add params to url in case of GET
			urlObj.searchParams.append(name, value);
		} else {
			// Otherwise store it for later
			params.append(name, value);
		}
	});

	xhr.open(method, urlObj.toString(), true);

	if (typeof options.contentType === 'string') {
		xhr.responseType = options.contentType;
	}
	if (typeof options.overrideMimeType === 'string') {
		xhr.overrideMimeType(options.overrideMimeType);
	}

	xhr.timeout = getPreference('timeout_delay') * 1000;

	if (options.hasOwnProperty('headers') === true && typeof options.headers === 'object') {
		for (let header in options.headers) {
			if (!options.headers.hasOwnProperty(header)) continue;

			let value = options.headers[header];
			xhr.setRequestHeader(header, value);
		}
	}



	const promise = waitEvent(xhr, 'loadend');

	if (method === 'GET') {
		xhr.send();
	} else {
		xhr.send(params.toString());
	}

	await promise;



	const response = {
		'url': xhr.responseURL,
		'json': null,
		'status': xhr.status,
		'statusText': xhr.statusText,
		'header': xhr.getAllResponseHeaders()
	};
	if (xhr.responseType === '' || xhr.responseType === 'text') {
		response.text = xhr.responseText;
	}
	if (typeof xhr.response !== 'undefined') {
		response.response = xhr.response;
	}

	if (typeof options.customJSONParse === 'function') {
		let data = null;
		try {
			data = options.customJSONParse(xhr);
		} catch (e) {
			ZDK.console.error(e);
		}

		response.json = data;
	} else if (xhr.responseType === 'document' && typeof options.Request_documentParseToJSON === 'function') {
		let result = options.Request_documentParseToJSON(xhr);
		if (result instanceof Map) {
			response.map = result;
			response.json = ZDK.mapToObj(result);
		} else {
			response.json = result;
		}
	} else {
		try {
			response.json = JSON.parse(xhr.responseText);
		} catch (error) {
			response.json = null;
		}
	}

	Object.freeze(response);
	return response;
}

/**
 * @typedef {Object} CustomRequestOptions
 * @property {string} url
 * @property {Object} [headers]
 * @property {string} [contentType]
 * @property {string} [overrideMimeType]
 * @property {function} [Request_documentParseToJSON]
 * @property {string[][]} [content]
 * @property {function} [customJSONParse]
 */
/**
 *
 * @param {CustomRequestOptions} options
 * @returns {{get: get, post: post}}
 * @constructor
 */
function Request(options) {
	if (typeof options.url !== "string" || options.hasOwnProperty('onComplete') || (options.hasOwnProperty('content') && Array.isArray(options.content) === false) || (options.hasOwnProperty('customJSONParse') && typeof options.customJSONParse !== 'function')) {
		throw new Error('Error in options');
	}
	if (options.hasOwnProperty('anonymous')) {
		ZDK.console.warn('Removed option "anonymous"')
	}

	if (options.content === undefined) {
		options.content = [];
	}

	return {
		'get': function () {
			return _core(options, 'GET');
		},
		'post': function () {
			return _core(options, 'POST');
		}
	};
}



export {
	Request
}