const templatesSource = window.templatesSource = new Map();
templatesSource.set('backgroundTheme', '/templates/backgroundTheme');
templatesSource.set('tabMover', '/templates/panel/tabMover');
templatesSource.set('tabMoverNative', '/templates/panel/tabMoverNative');
templatesSource.set('tabPageServerIp', '/templates/panel/tabPageServerIp');



/**
 *
 * @return {Promise<twig.Twig>}
 */
export async function getTwig() {
	if (!window.Twig) {
		await import('../lib/twig.min.js');
	}
	return window.Twig;
}

/**
 *
 * @param {string} templateId
 * @param {Dict<*>} data
 * @return {Promise<string>}
 */
export async function renderTemplate(templateId, data) {
	const twigTemplate = await getTemplate(templateId);
	return await twigTemplate.render(data);
}

const loadMap = new Map();

/**
 *
 * @param {string} templateId
 * @return {Promise<Twig>}
 */
export async function getTemplate(templateId) {
	let loadedTemplate = loadMap.get(templateId);
	if (!loadedTemplate) {
		const templatePath = templatesSource.get(templateId);
		if (!templatePath) {
			throw new Error('UNKNOWN_TEMPLATE');
		}

		try {
			const response = await fetch(chrome.runtime.getURL(templatePath + '.twig'));
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
	return (await getTwig()).twig({
		data: template
	})
}
