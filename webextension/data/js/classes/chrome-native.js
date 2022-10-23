const port = chrome.runtime.connectNative('eu.gitlab.zatsunenomokou.chromenativebridge');

port.onMessage.addListener(function(msg) {
	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}

	if (msg.type === 'ws open') {
		console.dir(msg);
	}
});

/**
 *
 * @returns {string}
 */
function randomId() {
	let output = '';
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
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
 * @param {object} [data]
 * @return {string}
 */
function callNative(command, data={}) {
	const _id = randomId();
	port.postMessage({
		...data,
		_id,
		command
	});
	return _id;
}

/**
 *
 * @see callNative
 * @param {string} command
 * @param {object} [data]
 * @param {number} timeout
 * @return {Promise<unknown>}
 */
function fnNative(command, data={}, timeout=5000) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, data);

		const timerId = setTimeout(() => {
			port.onMessage.removeListener(callback);
			reject(new Error('TIMEOUT'));
		}, timeout);

		const callback = function callback(msg, port) {
			if (msg.type !== "commandReply" || msg.data._id !== _id) return;

			clearTimeout(timerId);
			port.onMessage.removeListener(callback);

			if (!!msg.error) {
				console.debug(msg);
				reject(msg);
			} else if (msg && msg.data) {
				if (msg.type === 'error' || msg.error !== false) {
					reject(msg);
				} else {
					resolve(msg.result);
				}
			} else {
				reject(new Error('UnexpectedMessage'));
			}
		};
		port.onMessage.addListener(callback);
	});
}



export function ping() {
	callNative('ping');
}

/**
 *
 * @param {string} id
 * @return {Promise<*>}
 */
export async function getPreference(id) {
	const result = await fnNative('getPreference', {
		id
	});
	return result.value;
}

/**
 *
 * @param {string[]} ids
 * @return {Promise<*[]>}
 */
export async function getPreferences(ids) {
	const result = await fnNative('getPreferences', {
		ids
	});

	const output = new Map();
	for (let {id, value} of Object.values(result)) {
		output.set(id, value);
	}
	return output;
}

/**
 *
 * @return {Promise<*[]>}
 */
export async function getDefaultValues() {
	return await fnNative('getDefaultValues');
}
self.getDefaultValues = getDefaultValues;

/**
 *
 * @param {string} sectionName
 * @return {Promise<*[]>}
 */
export async function showSection(sectionName) {
	return await fnNative('showSection', {
		sectionName
	});
}
