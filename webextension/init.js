const zDK = new ZDK("/data/js/");

if(browser.extension.getBackgroundPage() !== null){
	browser.extension.getBackgroundPage().zDK = zDK;
}

async function loadMustacheTemplates(map) {
	let templatePromises = new Map(),
		templateMap = new Map();

	map.forEach((url, id) => {
		templatePromises.set(id, Request({
			url: browser.extension.getURL(url)
		}).get())
	});

	const templatesData = await PromiseWaitAll(templatePromises);
	for(let templateId in templatesData){
		if(templatesData.hasOwnProperty(templateId)){
			templateMap.set(templateId, templatesData[templateId].text);
			Mustache.parse(templateMap.get(templateId)); // Pre-parsing/Caching Template, optional, speeds up future uses
		}
	}
	return templateMap;
}

// appGlobal: Accessible with browser.extension.getBackgroundPage();
window.appGlobal = {};
window.openTabIfNotExist = ZDK.openTabIfNotExist;
const stringEllipse = ZDK.stringEllipse;

(async ()=>{
	await zDK.loadJS(document, [
		"options-data.js",
		"options-api.js"
	]);

	await PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise]);

	await zDK.loadJS(document, [
		"voiceAPI.js"
	]);

	const templatesSource = new Map();
	templatesSource.set("backgroundTheme", "/data/js/backgroundTheme.mst");
	templatesSource.set("panelCheckedDataItem", "/data/js/panelCheckedDataItem.mst");
	templatesSource.set("panelRssLinks", "/data/js/panelRssLinks.mst");

	moment.locale(browser.i18n.getMessage("language"));

	loadMustacheTemplates(templatesSource)
		.then(async (loadMap)=>{
			appGlobal.mustacheTemplates = loadMap;
			await chromeSettings.loadingPromise;
			await zDK.loadJS(document, ["backgroundTheme.js"]);
		})
	;

	let scriptsToLoad = [
		'index.js',
		'variousFeatures/refresh-data.js',
		'variousFeatures/hourly-alarm.js',
		'variousFeatures/muted-pause.js',
		'variousFeatures/iqdb.js',
	];

	if (typeof browser.windows !== "undefined") {
		scriptsToLoad.push("variousFeatures/windowsContextMenu.js");
	}

	await zDK.loadJS(document, scriptsToLoad);
})();
