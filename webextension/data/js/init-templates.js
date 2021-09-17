const templatesSource = window.templatesSource = new Map();
templatesSource.set('backgroundTheme', '/data/template/backgroundTheme.mst');
templatesSource.set('panelCheckedDataItem', '/data/template/panel/checkedDataItem.mst');
templatesSource.set('tabMover', '/data/template/panel/tabMover.mst');

moment.locale(browser.i18n.getMessage('language'));


async function loadMustacheTemplates(map) {
	let templatePromises = [],
		templateMap = new Map();

	for (const [id, url] of map) {
		templatePromises.push(new Promise((resolve, reject) => {
			fetch(browser.extension.getURL(url))
				.then(response => {
					resolve({id: id, response: response})
				})
				.catch(reason => {
					reject({id: id, response: reason})
				})
			;
		}));
	}

	const templatesData = await Promise.allSettled(templatePromises);
	for (let settledData of templatesData) {
		if (settledData.status === 'rejected') {
			console.error(settledData.reason);
			continue;
		}

		const data = settledData.value,
			templateId = data.id
		;
		const template = await data.response.text();
		templateMap.set(templateId, await template);
		Mustache.parse(template);
	}
	return templateMap;
}

loadMustacheTemplates(templatesSource)
	.then(async (loadMap)=>{
		appGlobal.mustacheTemplates = loadMap;
		await chromeSettings.loadingPromise;
	})
;