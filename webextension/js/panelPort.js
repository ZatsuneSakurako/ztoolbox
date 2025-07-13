/**
 *
 * @type {Set<chrome.runtime.Port>}
 */
let panelPorts = new Set();
export function getPanelPorts() {
	return panelPorts;
}

/**
 *
 * @param {chrome.runtime.Port} port
 */
function onDisconnect(port) {
	panelPorts.delete(port);
	port.onDisconnect.removeListener(onDisconnect);
	port.onMessage.removeListener(onMessage);
}

/**
 *
 * @type {((message:any) => void)[]}
 */
const onMessageCallbacks = [];

/**
 *
 * @param { (message:any) => void } cb
 */
export function onPanelMessage(cb) {
	onMessageCallbacks.push(cb);
}

/**
 *
 * @param {any} message
 * @param {chrome.runtime.Port} _
 */
function onMessage(message, _) {
	for (let onMessageCallback of onMessageCallbacks) {
		try {
			onMessageCallback.call(this, message);
		} catch (e) {
			console.error(e);
		}
	}
}

chrome.runtime.onConnect.addListener(port => {
	if (port.name !== 'panel' || !port.sender || port.sender.id !== chrome.runtime.id) {
		port.disconnect();
		return;
	}

	panelPorts.add(port);
	port.onDisconnect.addListener(onDisconnect);
	port.onMessage.addListener(onMessage);
});
