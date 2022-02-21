const port = chrome.runtime.connectNative('eu.gitlab.zatsunenomokou.chromenativebridge');

port.onMessage.addListener(function(msg) {
	if (typeof msg === 'string') {
		try {
			msg = JSON.parse(msg)
		} catch (_) {}
	}

	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}

	if (msg.type === 'ws open') {
		console.dir(msg);
	}
});

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
 * @param {string} command
 * @param {object} [data]
 * @return {Promise<unknown>}
 */
function fnNative(command, data={}) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, data);
		port.onMessage.addListener(function callback(msg, port) {
			if (typeof msg === 'string') msg = JSON.parse(msg);
			if (msg && msg.data._id === _id) {
				port.onMessage.removeListener(callback);

				if (msg.type === 'error' || msg.error !== false) {
					reject(msg)
				} else {
					resolve(msg.result);
				}
			}
		});
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
	return result.value;
}
