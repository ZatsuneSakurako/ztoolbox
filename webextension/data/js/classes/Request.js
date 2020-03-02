'use strict';



class Params extends Map {
	encode() {
		const array = [];
		this.forEach((value, key) => {
			array.push((value || typeof value === 'boolean') ? `${encodeURI(key)}=${encodeURI(value)}` : `${encodeURI(key)}`);
		});

		return array.join('&');
	}
}

const splitUri = (function () { // https://codereview.stackexchange.com/questions/9574/faster-and-cleaner-way-to-parse-parameters-from-url-in-javascript-jquery/9630#9630
	const splitRegExp = new RegExp(
		'^' +
		'(?:' +
		'([^:/?#.]+)' +                         // scheme - ignore special characters
		// used by other URL parts such as :,
		// ?, /, #, and .
		':)?' +
		'(?://' +
		'(?:([^/?#]*)@)?' +                     // userInfo
		'([\\w\\d\\-\\u0100-\\uffff.%]*)' +     // domain - restrict to letters,
		// digits, dashes, dots, percent
		// escapes, and unicode characters.
		'(?::([0-9]+))?' +                      // port
		')?' +
		'([^?#]+)?' +                           // path
		'(?:\\?([^#]*))?' +                     // query
		'(?:#(.*))?' +                          // fragment
		'$')
	;

	return function (uri) {
		let split;
		split = uri.match(splitRegExp);
		return {
			'scheme': split[1],
			'user_info': split[2],
			'domain': split[3],
			'port': split[4],
			'path': split[5],
			'query_data': split[6],
			'fragment': split[7]
		}
	};
})();


/**
 *
 * @param {Object} options
 * @returns {{get: get, post: post}}
 * @constructor
 */
function Request(options){
	if(typeof options.url !== "string" /*&& typeof options.onComplete !== "function"*/){
		ZDK.console.warn( "Error in options");
	} else {
		/**
		 *
		 * @param {String} method
		 * @returns {Promise<Object>}
		 */
		let core = function(method){
			return new Promise(resolve=>{
				let xhr;
				if(typeof options.anonymous === "boolean"){
					xhr = new XMLHttpRequest({anonymous:options.anonymous});
				} else {
					xhr = new XMLHttpRequest();
				}

				let content = (Array.isArray(options.content) || options.content instanceof Map)? options.content : [];
				if(method === 'GET'){
					// Extract query data from url to put it with the other
					const urlObj = splitUri(options.url);
					if(typeof urlObj.query_data === "string" && urlObj.query_data !== ""){
						let urlQuery = urlObj.query_data.split("&").map(value=>{
							return value.split("=");
						});
						if(Array.isArray(urlQuery)){
							if(Array.isArray(content)){
								content = urlQuery.concat(content);
							} else {
								content = urlQuery;
							}
							options.url = options.url.replace("?"+urlObj.query_data, "");
						}
					}
				}

				const params = new Params(content);

				xhr.open(method, ((method === 'GET')? `${options.url}${(params.size > 0)? `?${params.encode()}` : ""}` : options.url), true);

				if(typeof options.contentType === "string"){
					xhr.responseType = options.contentType;
				}
				if(typeof options.overrideMimeType === "string"){
					xhr.overrideMimeType(options.overrideMimeType);
				}

				xhr.timeout = getPreference("timeout_delay") * 1000;

				if(options.hasOwnProperty("headers") === true && typeof options.headers === "object"){
					for(let header in options.headers){
						if(!options.headers.hasOwnProperty(header)){ // Make sure to not loop constructors
							continue;
						}
						let value = options.headers[header];
						xhr.setRequestHeader(header, value);
					}
				}

				xhr.addEventListener("loadend", function(){
					let response = {
						"url": xhr.responseURL,
						"json": null,
						"status": xhr.status,
						"statusText": xhr.statusText,
						"header": xhr.getAllResponseHeaders()
					};
					if(xhr.responseType === "" || xhr.responseType === "text"){
						response.text= xhr.responseText;
					}
					if(typeof xhr.response !== "undefined"){
						response.response = xhr.response;
					}

					if(typeof options.customJSONParse === "string"){
						switch(options.customJSONParse){
							case "xmlToJSON":
								if(typeof xhr.responseXML === "undefined" || xhr.responseXML === null){
									response.json = null;
								} else {
									let xmlToStringParser = new XMLSerializer();
									let xmlText = xmlToStringParser.serializeToString(xhr.responseXML);

									try{
										// Source: https://www.sitepoint.com/how-to-convert-xml-to-a-javascript-object/
										let rawData = XML2jsobj(xhr.responseXML.documentElement);
										let data = {};

										/**		Flatten the object a bit		**/
										if(rawData.hasOwnProperty("body")){
											data = rawData.body;
											if(rawData.hasOwnProperty("version")){
												data.version = rawData.version;
											}
										} else {
											data = rawData;
										}
										/**		End flatten the object a bit		**/

										response.json = data;
									}
									catch(error){
										response.json = null;
									}
								}
								break;
							case "urlencodedToJSON":
								let jsonDATA = {};
								let splitedData = xhr.responseText.split("&");

								splitedData = splitedData.map((str)=>{
									return str.split("=");
								});
								for(let item of splitedData){
									jsonDATA[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
								}
								response.json = jsonDATA;
								break;
							default:
								ZDK.console.warn( `[Request] Unknown custom JSON parse ${options.customJSONParse}`);
						}
					} else if(typeof options.customJSONParse === "function"){
						let data = null;
						try {
							data = options.customJSONParse(xhr);
						} catch (e) {
							ZDK.console.error( e);
						}

						response.json = data;
					} else if(xhr.responseType === "document" && typeof options.Request_documentParseToJSON === "function"){
						let result = options.Request_documentParseToJSON(xhr);
						if(result instanceof Map){
							response.map = result;
							response.json = ZDK.mapToObj(result);
						} else {
							response.json = result;
						}
					} else {
						try{response.json = JSON.parse(xhr.responseText);}
						catch(error){response.json = null;}
					}

					if(typeof options.onComplete==="function"){
						options.onComplete(response);
					}
					resolve(response);
				});


				if(method === 'GET'){
					xhr.send();
				} else if(method === 'POST'){
					xhr.send(params.encode());
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
	Params,
	splitUri,
	Request
}