async function loadJS(callerDocument, list, prefix) {
	const isJSLoaded = (callerDocument, src) => {
		for(let script of callerDocument.scripts) {
			if (typeof script.src === "string" && script.src.indexOf(src) !== -1) {
				console.log(`"${src}" is already loaded`);
				return true;
			}
		}
		return false;
	};
	const insertJSNode = function(item) {
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
	};

	if(Array.isArray(list) && list.hasOwnProperty(length) === true && list.length > 0) {
		for (let item of list) {
			let src = item, asModule = true;
			if (typeof item === 'object') {
				src = item.src;
				// Only override asModule if the property is properly set as boolean
				if (item.hasOwnProperty('asModule') && typeof item.asModule === 'boolean') {
					asModule = item.asModule === true;
				}
			}

			if(isJSLoaded(callerDocument, src) === false) {
				if (asModule === true) {
					await import(chrome.extension.getURL(prefix + src));
				} else {
					await insertJSNode(src);
				}
			}
		}
	} else {
		return "EmptyList";
	}
}



export {
	loadJS
}