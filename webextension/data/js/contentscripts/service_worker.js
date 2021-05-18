/**
 *
 * @return {string}
 */
function uuid_v4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

/**
 *
 * @param {string} content
 */
function setPageJS(content) {
	const script = document.createElement('script');
	script.textContent = content;
	(document.head||document.documentElement).appendChild(script);
	script.remove();
}



const preferences = new Promise((resolve, reject) => {
	chrome.runtime.sendMessage({
		"data": {
			"id": "getPreferences",
			"preferences": [
				"serviceWorkerWhitelist"
			]
		},
	}, function onPrefCallback(prefData) {
		if (prefData.preferences.hasOwnProperty('serviceWorkerWhitelist') === false) {
			reject();
		}

		resolve(prefData.preferences.serviceWorkerWhitelist);
	});
});



/**
 *
 * Prevent registration by default. There is a small chance that registration happens before storage entry can be queried (almost never)
 * @param {string} extName
 * @param {string} uuid
 */
function overrideSw(extName, uuid) {
	// noinspection JSUnresolvedVariable
	const __serviceWorker_original = navigator.serviceWorker.register;
	const isWhitelisted = new Promise(resolve => {
		window.addEventListener('message', function onMessage(event) {
			const {data} = event;
			if (event.source !== window || typeof data !== 'object' || data === null || data.uuid !== uuid) {
				return;
			}

			switch (data.type) {
				case "preferences":
					window.removeEventListener('message', onMessage);
					resolve(data.whitelist || {});
					break;
			}
		}, false);
	});

	/**
	 *
	 * @param {string} domain
	 * @return {Promise<'blacklist'|'remove'|'whitelist'>}
	 */
	const getDomainState = async function getState(domain) {
		const whitelist = await isWhitelisted;

		/**
		 *
		 * @type {'blacklist'|'remove'|'whitelist'}
		 */
		let state = 'blacklist';
		if (!!whitelist['*']) {
			state = whitelist['*'];
		}
		if (!!whitelist[domain]) {
			state = 'whitelist'
		}

		return state;
	};

	(async () => {
		const currentServices = await navigator.serviceWorker.getRegistrations();
		for (let sw of currentServices) {
			/**
			 *
			 * @type {URL|null}
			 */
			let url = null;
			try {
				url = new URL(sw.scope, document.location.href);
			} catch (e) {}

			if (!!url && await getDomainState(url.hostname) === 'remove') {
				sw.unregister()
					.catch(console.error)
				;
			}
		}
	})()
		.catch(console.error)
	;

	navigator.serviceWorker.register = function register(path, options) {
		return new Promise(function (resolve, reject) {
			getDomainState(path)
				.then(whitelistedState => {
					if (whitelistedState !== 'whitelist') {
						reject(new Error(`Blocked by "${extName}"`));
						return;
					}

					__serviceWorker_original(path, options)
						.then(resolve)
						.catch(reject)
					;
				})
				.catch(reject)
			;

			window.postMessage({
				uuid,
				type: 'registerAttempt',
				resolvedScript: new URL(path, document.location.href),
				arguments: {
					path,
					options
				}
			}, '*');
		})
	};
}

const uuid = uuid_v4();
(async () => {
	setPageJS(`
'use strict';
const overrideSw = ${overrideSw};
overrideSw(${JSON.stringify(chrome.runtime.getManifest().name)}, ${JSON.stringify(uuid)});
`);

	const whitelist = await preferences;
	setTimeout(() => {
		window.postMessage({
			type: 'preferences',
			uuid,
			whitelist
		}, '*');
	});
})()
	.catch(console.error)
;



const serviceWorkers = [];
window.addEventListener('message', function (event) {
	const {data} = event,
		extName = chrome.runtime.getManifest().name
	;
	if (event.source !== window || typeof data !== 'object' || data === null || data.uuid !== uuid) {
		return;
	}

	switch (data.type) {
		case "preferences":
			break;
		case 'registerAttempt':
			serviceWorkers.push(data.arguments);
			console.dir(serviceWorkers)
			break;
		default:
			console.warn(`[${extName}] Unknown message type "${data.type}"`);
	}
}, false);



function onConnect(port) {
	if (port.sender.id !== chrome.runtime.id || port.name !== 'ztoolbox_service-worker') {
		return;
	}

	port.postMessage({
		serviceWorkers,
		domain: document.domain
	});
	port.disconnect();
}
let timeout;
chrome.runtime.onConnect.addListener(function (port) {
	if (timeout === undefined) {
		timeout = setTimeout(() => {
			onConnect(port);
		}, 100)
	} else {
		onConnect(port);
	}
});