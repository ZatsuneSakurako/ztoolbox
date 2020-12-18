import {PromiseWaitAll} from "./classes/PromiseWaitAll.js";
import {init} from "./backgroundTheme.js";

const templatesSource = window.templatesSource = new Map();
templatesSource.set('backgroundTheme', '/data/js/backgroundTheme.mst');
templatesSource.set('panelCheckedDataItem', '/data/js/panelCheckedDataItem.mst');
templatesSource.set('panelRssLinks', '/data/js/panelRssLinks.mst');

moment.locale(browser.i18n.getMessage('language'));


async function loadMustacheTemplates(map) {
	let templatePromises = new Map(),
		templateMap = new Map();

	map.forEach((url, id) => {
		templatePromises.set(id, fetch(browser.extension.getURL(url)))
	});

	const templatesData = await PromiseWaitAll(templatePromises);
	for (let templateId in templatesData) {
		if(templatesData.hasOwnProperty(templateId)){
			templateMap.set(templateId, await templatesData[templateId].text());
			Mustache.parse(templateMap.get(templateId)); // Pre-parsing/Caching Template, optional, speeds up future uses
		}
	}
	return templateMap;
}

loadMustacheTemplates(templatesSource)
	.then(async (loadMap)=>{
		appGlobal.mustacheTemplates = loadMap;
		await chromeSettings.loadingPromise;
		init();
	})
;