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
}

chrome.runtime.onConnect.addListener(port => {
	if (port.name !== 'panel' || !port.sender || port.sender.id !== chrome.runtime.id) {
		port.disconnect();
		return;
	}

	panelPorts.add(port);
	port.onDisconnect.addListener(onDisconnect);
});
