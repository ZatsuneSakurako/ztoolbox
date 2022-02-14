const port = chrome.runtime.connectNative('eu.gitlab.zatsunenomokou.chromenativebridge');

// noinspection JSUnusedLocalSymbols
port.onMessage.addListener(function(msg, port) {
	if (typeof msg === 'string') {
		try {
			msg = JSON.parse(msg)
		} catch (_) {}
	}

	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}

	if (msg.result && typeof msg.result === 'object') {
		if (msg.result.connected === 'z-toolbox') {
			//
		}
	}
});

/*setTimeout(() => {
	port.postMessage({command: 'getPreference', id: "theme"});
	port.postMessage("ping");
}, 5000);*/

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

function callNative(command, data) {
	const _id = randomId();
	port.postMessage({
		...data,
		_id,
		command
	});
	return _id;
}

function fnNative(command, data) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, data);
		port.onMessage.addListener(function callback(msg, port) {
			if (typeof msg === 'string') msg = JSON.parse(msg);
			if (msg && msg._id === _id) {
				port.onMessage.removeListener(callback);
				resolve(msg);
			}
		});
	});
}