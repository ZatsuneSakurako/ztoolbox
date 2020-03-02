'use strict';



/**
 *
 * @param {Object} options
 * @param {string} options.url
 * @param {string[][]} [options.content]
 * @param {'urlencodedToJSON'|function} [options.customJSONParse]
 * @returns {{get: get, post: post}}
 * @constructor
 */
function Request(options) {
	if (typeof options.url !== "string" || options.hasOwnProperty('onComplete') || options.content instanceof Map || (options.hasOwnProperty('customJSONParse') && options.customJSONParse !== 'urlencodedToJSON')) {
		ZDK.console.warn( "Error in options");
	} else {
		/**
		 *
		 * @param {string} method
		 * @returns {Promise<Object>}
		 */
		let core = function(method) {
			return new Promise(resolve => {
				let xhr;
				if (typeof options.anonymous === 'boolean') {
					xhr = new XMLHttpRequest({anonymous:options.anonymous});
				} else {
					xhr = new XMLHttpRequest();
				}

				const urlObj = new URL(options.url),
					params = new URLSearchParams()
				;

				let content = Array.isArray(options.content)? options.content : [];
				if (method === 'GET') {
					// Add params to url in case of GET
					content.forEach((value, name) => {
						urlObj.searchParams.append(name, value);
					});
				} else {
					// Otherwise store it for later
					content.forEach((value, name) => {
						params.append(name, value);
					});
				}

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
						if(!options.headers.hasOwnProperty(header)) continue;

						let value = options.headers[header];
						xhr.setRequestHeader(header, value);
					}
				}

				xhr.addEventListener('loadend', function() {
					let response = {
						'url': xhr.responseURL,
						'json': null,
						'status': xhr.status,
						'statusText': xhr.statusText,
						'header': xhr.getAllResponseHeaders()
					};
					if (xhr.responseType === '' || xhr.responseType === 'text') {
						response.text= xhr.responseText;
					}
					if (typeof xhr.response !== 'undefined') {
						response.response = xhr.response;
					}

					if (typeof options.customJSONParse === 'string') {
						let jsonDATA = {};
						let splitedData = xhr.responseText.split("&");

						splitedData = splitedData.map((str) => {
							return str.split('=');
						});
						for(let item of splitedData){
							jsonDATA[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
						}
						response.json = jsonDATA;
					} else if (typeof options.customJSONParse === 'function') {
						let data = null;
						try {
							data = options.customJSONParse(xhr);
						} catch (e) {
							ZDK.console.error( e);
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
						try{response.json = JSON.parse(xhr.responseText);}
						catch(error){response.json = null;}
					}

					resolve(response);
				});


				if (method === 'GET') {
					xhr.send();
				} else if(method === 'POST') {
					xhr.send(params.toString());
				} else {
					throw `Unknown method "${method}"`
				}
			});
		};


		return {
			'get' : function() {
				return core('GET');
			},
			'post' : function() {
				return core('POST');
			}
		};
	}
}



export {
	Request
}