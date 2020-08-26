// appGlobal: Accessible with browser.extension.getBackgroundPage();
window.appGlobal = {};

(async () => {
	const ADDON_JS_ROOT = window.ADDON_JS_ROOT = '/data/js';
	const { setBaseDir, loadJS } = await import('./classes/loadJS.js');
	setBaseDir(ADDON_JS_ROOT);

	await loadJS(document, [
		'lib/browser-polyfill.js',
		'lib/i18next.js',
		'lib/i18nextXHRBackend.js',
		'lib/mustache.js',
		'lib/lodash.custom.min.js',

		// 'lib/moment.js',
		// 'lib/moment-locale-fr.js',
	]);

	const classesModules = await loadJS(document, [
		'classes/responseDocument.js',
		'classes/Request.js',
		'classes/loadJS.js',
		'classes/chrome-notification-controller.js',
		'classes/chrome-preferences.js',
		'classes/i18extended.js',
		'classes/queue.js',
		'classes/data-store.js',
		'classes/ztimer.js',
		'classes/version.js',
		'classes/ZDK.js'
	]);

	const { ZDK } = classesModules.find(m => !!m.ZDK);
	const zDK = new ZDK(ADDON_JS_ROOT);
	const backgroundPage = browser.extension.getBackgroundPage();
	if (backgroundPage !== null) {
		backgroundPage.zDK = zDK;
		/**
		 * @global
		 * @type {ZDK}
		 */
		backgroundPage.ZDK = ZDK;
	}
	window.openTabIfNotExist = ZDK.openTabIfNotExist;



	const [, { chromeSettings }] = await loadJS(document, [
		'options-data.js',
		'options-api.js'
	]);

	const {PromiseWaitAll} = await import('./classes/PromiseWaitAll.js');
	await PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise]);

	await loadJS(document, [
		 'voiceAPI.js'
	]);



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
			await loadJS(document, ["backgroundTheme.js"]);
		})
	;



	const { Directory } = await import('./Directory.js');
	const directoryObject = window.directoryObject = await Directory.getPackageDir();
	await directoryObject.recursivelyGetEntries();

	let scriptsToLoad = [
		'env.js',
		'index.js'
	];

	scriptsToLoad.push(...Array.from(
		directoryObject.get(ADDON_JS_ROOT).get('variousFeatures').values()
	)
		.map(f => `variousFeatures/${f.name}`)
	);

	await loadJS(document, scriptsToLoad);
})();
