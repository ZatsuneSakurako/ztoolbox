function setVariable(jsonData) {
	// /!\ /!\ MAIN WORLD mode /!\ /!\
	console.log(`window.jsonData = `, jsonData);
	window.jsonData = jsonData;
	// /!\ /!\ MAIN WORLD mode /!\ /!\
}

export function onDevToolsJson(data) {
	console.dir(data)
	chrome.scripting.executeScript({
		target: {
			tabId: data.tabId,
			allFrames: false
		},
		func: setVariable,
		args: [data.jsonData],
		"world": "MAIN",
	})
	/*chrome.tabs.executeScript(data.tabId, {
		code: `window["json"] = ${JSON.stringify(data.jsonData)};console.dir(window.json);`,
	})
		.catch(console.error)
	;*/
}
