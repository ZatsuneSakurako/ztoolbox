const port = chrome.runtime.connectNative('eu.gitlab.zatsunenomokou.chromenativebridge');

port.onMessage.addListener(function(msg) {
	if (location.pathname.endsWith('panel.html') || location.pathname.endsWith('options.html')) {
		return;
	}
	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}

	switch (msg.type ?? null) {
		case 'ws open':
			console.log('[NativeMessaging]', 'ws open', msg);
			port.postMessage({
				type: 'extensionName',
				data: {
					userAgent: navigator.userAgent,
					extensionId: chrome.runtime.id
				}
			});
			break;
		case 'ws close':
			console.log('[NativeMessaging]', 'ws close', msg);
			break;
		case "log":
			console.log('[NativeMessaging] log', msg.data);
			break;
		case 'ping':
			port.postMessage({
				type: 'commandReply',
				_id: msg._id
			});
			break;
		case 'commandReply':
			break;
		default:
			console.log('[NativeMessaging]', 'Unknown type', msg);
	}
});

/**
 *
 * @returns {string}
 */
function randomId() {
	let output = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
	for (let i = 0; i <= 16; i++) {
		characters.sort(() => {
			return Math.random() * 2 - 1;
		});
		output += characters[Math.round(Math.random() * characters.length - 1)];
	}
	return output;
}

/**
 * Return the generated message id
 * @param {string} command
 * @param {any[]} data
 * @return {string}
 */
function callNative(command, ...data) {
	const _id = randomId();
	port.postMessage({
		_id,
		data: data.length === 0 ? undefined : data,
		type: command
	});
	return _id;
}

const timeout = 5000;
/**
 *
 * @see callNative
 * @param {string} command
 * @param {any[]} data
 * @return {Promise<unknown>}
 */
function fnNative(command, ...data) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, ...data);

		const timerId = setTimeout(() => {
			port.onMessage.removeListener(callback);
			reject(new Error('TIMEOUT'));
		}, timeout);

		const callback = function callback(msg, port) {
			if (msg.type !== "commandReply" || msg._id !== _id) return;

			clearTimeout(timerId);
			port.onMessage.removeListener(callback);

			if (!!msg.error) {
				reject(msg);
			} else if (msg.result) {
				resolve(msg.result);
			} else {
				reject(new Error('UnexpectedMessage'));
			}
		};
		port.onMessage.addListener(callback);
	});
}



export async function ping() {
	try {
		await fnNative('ping');
		console.info('[NativeMessaging] pong');
	} catch (e) {
		console.error(e);
	}
}
self.ping = ping;

/**
 *
 * @param {string} id
 * @return {Promise<*>}
 */
export async function getPreference(id) {
	const {result} = await fnNative('getPreference', id);
	return result.value;
}

/**
 *
 * @param {string[]} ids
 * @return {Promise<Map<string, undefined|*>>}
 */
export async function getPreferences(ids) {
	const {result} = await fnNative('getPreferences', ids);

	const output = new Map();
	for (let {id, value} of result) {
		output.set(id, value);
	}
	return output;
}

/**
 *
 * @return {Promise<Dict<WebsiteData>>}
 */
export async function getWebsitesData() {
	const {error, result} = await fnNative('getWebsitesData');
	if (!!error) {
		throw new Error(error ?? 'UNKNOWN_ERROR');
	}
	return result;
}

/**
 *
 * @param {Dict<WebsiteData>} websitesData
 * @return {Promise<void>}
 */
export async function sendWebsitesData(websitesData) {
	return await callNative('sendWebsitesData', websitesData);
}

/**
 *
 * @return {Promise<*[]>}
 */
export async function getDefaultValues() {
	const {result} = await fnNative('getDefaultValues');
	return result;
}
self.getDefaultValues = getDefaultValues;

/**
 *
 * @param {string} sectionName
 * @return {Promise<*[]>}
 */
export async function showSection(sectionName) {
	const {result} = await fnNative('showSection', sectionName);
	return result;
}
