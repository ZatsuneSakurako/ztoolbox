let baseDir = '/data/js';

/**
 *
 * @param {string} newBaseDir
 */
export function setBaseDir(newBaseDir) {
	baseDir = newBaseDir;
}

function isJSLoaded(callerDocument, src) {
	for (let script of callerDocument.scripts) {
		if (typeof script.src === "string" && script.src.indexOf(src) !== -1) {
			console.log(`"${src}" is already loaded`);
			return true;
		}
	}
	return false;
}

function insertJSNode(callerDocument, prefix, item) {
	return new Promise((resolve, reject) => {
		let newJS = callerDocument.createElement("script");
		newJS.src = chrome.extension.getURL(prefix + item);
		newJS.onload = () => {
			newJS.onload = null;
			resolve(true);
		};
		newJS.onerror = reject;
		callerDocument.querySelector("body").appendChild(newJS);
	});
}

/**
 *
 * @param callerDocument
 * @param { {src: string, asModule: boolean=true}[] } list
 * @param {string} [prefix]
 * @return {Promise<string>}
 */
export async function loadJS(callerDocument, list, prefix) {
	if (prefix === undefined) {
		prefix = baseDir;
	}

	prefix = prefix.replace(/\/$/,'') + '/';

	const results = [];
	if(Array.isArray(list) && list.length > 0) {
		for (let i = 0; i < list.length; i++) {
			const item = list[i];

			let src = item, asModule = true;
			if (typeof item === 'object') {
				src = item.src;
				// Only override asModule if the property is properly set as boolean
				if (item.hasOwnProperty('asModule') && typeof item.asModule === 'boolean') {
					asModule = item.asModule === true;
				}
			}

			if (isJSLoaded(callerDocument, src) === false) {
				if (asModule === true) {
					results[i] = await import(chrome.extension.getURL(prefix + src));
				} else {
					results[i] = await insertJSNode(callerDocument, prefix, src);
				}
			}
		}
		return results;
	} else {
		return "EmptyList";
	}
}
