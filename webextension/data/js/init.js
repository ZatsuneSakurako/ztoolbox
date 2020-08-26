// appGlobal: Accessible with browser.extension.getBackgroundPage();
window.appGlobal = {};

(async () => {
	await Promise.all(
		[
			'browser-polyfill',
			'i18next',
			'i18nextXHRBackend',
			'mustache',
			'lodash.custom.min',

			// 'moment',
			// 'moment-locale-fr',
		]
			.map(moduleName => import(`./lib/${moduleName}.js`))
	);
	await Promise.all(
		[
			'responseDocument',
			'Request',
			'loadJS',
			'chrome-notification-controller',
			'chrome-preferences',
			'i18extended',
			'queue',
			'data-store',
			'ztimer',
			'version'
		]
			.map(moduleName => import(`./classes/${moduleName}.js`))
	);
	const { ZDK } = await import('./classes/ZDK.js');
	const zDK = new ZDK('/data/js/');
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



	await zDK.loadJS(document, [
		'options-data.js',
		'options-api.js'
	]);

	const {PromiseWaitAll} = await import('./classes/PromiseWaitAll.js');
	await PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise]);

	await zDK.loadJS(document, [
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
			await zDK.loadJS(document, ["backgroundTheme.js"]);
		})
	;

	let scriptsToLoad = [
		'env.js',
		'index.js',
		'variousFeatures/refresh-data.js',
		'variousFeatures/hourly-alarm.js',
		'variousFeatures/muted-pause.js',
		'variousFeatures/iqdb.js',
		'variousFeatures/untrackMe.js',
	];

	if (typeof browser.windows !== "undefined") {
		scriptsToLoad.push("variousFeatures/windowsContextMenu.js");
	}

	await zDK.loadJS(document, scriptsToLoad);
})();
