function setVariable(jsonData) {
	// /!\ /!\ MAIN WORLD mode /!\ /!\
	console.log(`window.jsonData = `, jsonData);
	window.jsonData = jsonData;
	// /!\ /!\ MAIN WORLD mode /!\ /!\
}

export function onDevToolsJson(data) {
	chrome.scripting.executeScript({
		target: {
			tabId: data.tabId,
			allFrames: false
		},
		func: setVariable,
		args: [data.jsonData],
		"world": "MAIN",
	})
		.catch(console.error)
	;
}
