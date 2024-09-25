import {theme_cache_update} from "../classes/backgroundTheme.js";
import '../../lib/textea-json-viewer.js';

/**
 *
 * @type {(props: import('@textea/json-viewer').JsonViewerProps) => import('react').React.ReactElement}
 */
const JsonViewer = window.JsonViewer;

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


/**
 *
 * @param {HTMLElement} container
 * @param json
 */
function buildRecursiveUL(container, json) {
	const ul = document.createElement('ul');
	container.appendChild(ul);

	for (let [key, value] of Object.entries(json)) {
		const li = document.createElement('li');
		li.textContent = key;

		if (typeof value === 'object' && value !== null) {
			buildRecursiveUL(li, value);
		}

		ul.appendChild(li);
	}
}

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
	new JsonViewer({
		value: json,
		enableClipboard: false,
		theme: {
			scheme: 'monokai',
			author: 'wimer hazenberg (http://www.monokai.nl)',
			base00: '#272822',
			base01: '#383830',
			base02: '#49483e',
			base03: '#75715e',
			base04: '#a59f85',
			base05: '#f8f8f2',
			base06: '#f5f4f1',
			base07: '#f9f8f5',
			base08: '#f92672',
			base09: '#fd971f',
			base0A: '#f4bf75',
			base0B: '#a6e22e',
			base0C: '#a1efe4',
			base0D: '#66d9ef',
			base0E: '#ae81ff',
			base0F: '#cc6633',
		}
	}).render($main)
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
