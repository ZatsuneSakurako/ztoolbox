const templatesSource = window.templatesSource = new Map();
templatesSource.set('backgroundTheme', '/data/template/backgroundTheme.mst');
templatesSource.set('panelCheckedDataItem', '/data/template/panel/checkedDataItem.mst');
templatesSource.set('tabMover', '/data/template/panel/tabMover.mst');


export async function getMustache() {
	if (!window.Mustache) {
		await import('./lib/mustache.js');
	}
	return window.Mustache;
}

export async function renderTemplate(templateId, context) {
	return (await getMustache()).render(await getTemplate(templateId), context);
}

const loadMap = new Map();
export async function getTemplate(templateId) {
	let loadedTemplate = loadMap.get(templateId);
	if (!loadedTemplate) {
		const templatePath = templatesSource.get(templateId);
		if (!templatePath) {
			throw new Error('UNKNOWN_TEMPLATE');
		}

		try {
			const response = await fetch(browser.runtime.getURL(templatePath));
			const loadText = new Promise((resolve, reject) => {
				response.text()
					.then(resolve)
					.catch(reject)
			})
			loadedTemplate = {id: templateId, response: loadText};
		} catch (reason) {
			console.error(reason);
			loadedTemplate = {id: templateId, reason: reason}
		}
		loadMap.set(templateId, loadedTemplate);
	}


	if (!loadedTemplate.response) {
		console.dir(loadedTemplate)
		throw new Error('TEMPLATE_LOADING_ERROR');
	}

	const template = await loadedTemplate.response;
	(await getMustache()).parse(template);

	return template;
}

export async function getTemplates(...templates) {
	let templatePromises = [],
		templateMap = new Map()
	;

	for (const id of templates) {
		templatePromises.push(getTemplate(id));
	}

	const templatesData = await Promise.allSettled(templatePromises);
	for (let [i, settledData] of templatesData.entries()) {
		if (settledData.status === 'rejected') {
			console.error(settledData.reason);
			continue;
		}

		templateMap.set(templates[i], settledData.value);

	}
	return templateMap;
}
