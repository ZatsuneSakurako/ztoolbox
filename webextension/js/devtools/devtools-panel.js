import {theme_cache_update} from "../classes/backgroundTheme.js";
import {ZJsonViewer} from "./ZJsonViewer.js";

/**
 *
 * @returns {Promise<chrome.devtools.inspectedWindow.Resource[]>}
 */
function getResources() {
	return new Promise((resolve) => {
		chrome.devtools.inspectedWindow.getResources(resolve);
	})
}

/**
 *
 * @param {chrome.devtools.inspectedWindow.Resource} resource
 * @returns {Promise<{content: string, encoding: string}>}
 */
function getResourceContent(resource) {
	return new Promise((resolve) => {
		resource.getContent(function (content, encoding) {
			resolve({ content, encoding });
		});
	})
}

async function init() {
	window.optionColorStylesheet = await theme_cache_update(document.querySelector('#generated-color-stylesheet'));
	if (typeof optionColorStylesheet === 'object' && optionColorStylesheet !== null) {
		console.info("Theme update");

		let currentThemeNode = document.querySelector('#generated-color-stylesheet');
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.body.dataset.theme = optionColorStylesheet.dataset.theme;

		document.head.appendChild(optionColorStylesheet);
	}

	const resources = await getResources(),
		mainDoc = resources.find(resource => resource.type === 'document')
	;

	let json = null;
	try {
		const mainDocContent = await getResourceContent(mainDoc);
		console.log('[ZToolBox] mainDocContent :', mainDocContent);
		json = JSON.parse(mainDocContent.content)
	} catch (e) {
		console.error(e);
		console.dir(resources)
	}

	if (json) {
		onJsonContent(mainDoc, json);
	}
}
init()
	.catch(console.error)
;



function onJsonContent(resource, json) {
	console.info('onJsonContent', resource, json);
	const $main = document.querySelector('main');
	$main.innerHTML = '';
	chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'ztoolbox_devtools_json',
		data: {
			tabId: chrome.devtools.inspectedWindow.tabId,
			jsonData: json
		}
	});

	new ZJsonViewer(json).render($main);
}


chrome.devtools.network.onRequestFinished.addListener(function handleRequestFinished(request) {
	let contentType = null;
	try {
		contentType = request.response.headers.find(el => el.name === "content-type")?.value
	} catch (e) {
		console.error(e);
	}

	if (!contentType || !/json/i.test(contentType)) return;

	// noinspection JSUnusedLocalSymbols
	request.getContent((content, encoding) => {
		onJsonContent(request, JSON.parse(content));
	});
});
