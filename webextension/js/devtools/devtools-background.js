import {webRequestFilter} from "../constants.js";

function setVariable() {
	// /!\ /!\ MAIN WORLD mode /!\ /!\
	let jsonData = undefined;
	try {
		jsonData = JSON.parse(document.body.textContent);
	} catch (e) {
		console.error(e);
	}
	console.log(`window.jsonData = `, jsonData);
	window.jsonData = jsonData;
	// /!\ /!\ MAIN WORLD mode /!\ /!\
}

chrome.webRequest.onHeadersReceived.addListener(function (details) {
	const hasJsonContentType = details.responseHeaders?.find(header => {
		if (header.name.toLocaleLowerCase() !== 'content-type') return false;

		const contentTypeValue = header.value.split(';').at(0);
		return /^((application|text)\/json|text\/plain)$/i.test(contentTypeValue);
	});

	if (hasJsonContentType) {
		chrome.scripting.executeScript({
			target: {
				tabId: details.tabId,
				allFrames: false
			},
			func: setVariable,
			args: [],
			"world": "MAIN",
		})
			.catch(console.error)
		;
	}
}, webRequestFilter, ['responseHeaders']);
