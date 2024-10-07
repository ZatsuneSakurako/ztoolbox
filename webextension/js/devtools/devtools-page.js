import {isFirefox} from "../utils/browserDetect.js";

if (!isFirefox) {
	// JSON Viewer not necessary in Firefox and injecting variable does not work
	chrome.devtools.panels.create(chrome.runtime.getManifest().name, "/icons/star.png", "/devtools-panel.html", (newPanel) => {
		newPanel.onShown.addListener(initialisePanel);
		newPanel.onHidden.addListener(unInitialisePanel);
	});
}

function initialisePanel() {
	console.info('initialisePanel', ...arguments);
}

function unInitialisePanel() {
	console.info('unInitialisePanel', ...arguments);
}
