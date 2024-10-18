import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";
import "../utils/onImageError.js";
import {getPreference} from "../classes/chrome-preferences.js";
import {chromeNativeConnectedStorageKey} from "../classes/chrome-native-settings.js";
import {generateThumbnail} from "../utils/captureScreenshot.js";
import './newTab-reopenTab.js';
import {reopenTabStateRefresh} from "./newTab-reopenTab.js";
import {BookmarksResolver} from "./BookmarksResolver.js";

const newTabImagesStorage = '_newTabImages',
	newTabCapturesStorage = '_newTabCaptures',
	imageUrlAlgorithm = 'SHA-256'
;

/**
 *
 * @param {string} string
 * @param {AlgorithmIdentifier} algorithm
 */
async function generateChecksum(string, algorithm) {
	const encoder = new TextEncoder(),
		data = encoder.encode(string),
		hash= await crypto.subtle.digest(algorithm, data)
	;
	const hashArray = Array.from(new Uint8Array(hash));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

self.BookmarksResolver = BookmarksResolver;

/**
 *
 * @returns {Promise<Map<string, chrome.bookmarks.BookmarkTreeNode>>}
 */
async function loadBookmarks() {
	/**
	 *
	 * @type {Map<string, BookmarkTreeNode>}
	 */
	const output = new Map();

	const bookmarkResolver = new BookmarksResolver();
	await bookmarkResolver.loadBookmarks();

	for (let folderName of ['Speed Dial']) {
		const bookmarks = Array.isArray(folderName) ? bookmarkResolver.get(...folderName) : bookmarkResolver.get(folderName);
		if (bookmarks) {
			output.set(folderName, bookmarks);
		}
	}

	return output;
}

async function loadSpeedDial() {
	console.debug('load SpeedDial...')

	loadStylesheet()
		.catch(console.error)
	;

	const $newTabContainer = document.querySelector('#newTabContainer');
	if (!$newTabContainer) {
		console.error('Missing newTabContainer');
		return;
	}

	const data = await loadBookmarks()
		.catch(console.error)
	;
	console.debug('loadBookmarks', data);

	/**
	 *
	 * @type {Dict<string> & { _manifest: Dict<string> }}
	 */
	let newTabImages = null;
	let newTabCaptures = null;
	try {
		const result = (await chrome.storage.local.get([
			newTabImagesStorage,
			newTabCapturesStorage,
		]));
		newTabImages = result[newTabImagesStorage];
		newTabCaptures = result[newTabCapturesStorage];
		console.debug('session newTabImages', newTabImages);
	} catch (e) {
		console.error(e);
	}

	if (!newTabImages) {
		/**
		 *
		 * @type {Map<string, string|null|Promise<string>>}
		 */
		const newImages = new Map();
		if (data) {
			for (let [, newTabData] of data) {
				for (let child of newTabData.children) {
					const bookmarkUrlChecksum = await generateChecksum(child.url, imageUrlAlgorithm);
					if (newImages.has(bookmarkUrlChecksum)) {
						continue;
					}

					newImages.set(bookmarkUrlChecksum, (async () => {
						return await fetchSeoMetaData(child.url);
					})());
				}
			}

			for (let [key, value] of newImages) {
				if (value instanceof Promise) {
					value = (await value.catch(console.error)) ?? null;
				}
				newImages.set(key, value);
			}

			newTabImages = Object.fromEntries(newImages);
			await chrome.storage.local.set({
				[newTabImagesStorage]: newTabImages
			})
				.catch(console.error)
			;
			console.debug('newTabImages', newTabImages);
		} else {
			newTabImages = {};
		}
	}

	// Copy node list as we are removing them
	for (let child of [...$newTabContainer.children]) {
		child.remove();
	}

	appendTo($newTabContainer, await renderTemplate('newTab', {
		'bookmarks': Object.fromEntries(data),
		async getMeta(bookmark) {
			const url = bookmark.url,
				checksum = await generateChecksum(url, imageUrlAlgorithm),
				output = {}
			;

			if (newTabCaptures && typeof newTabCaptures[checksum] === 'string' ) {
				output.capture = newTabCaptures[checksum];
			}

			output._hostname = null;
			try {
				output._hostname = new URL(url).hostname;
			} catch (_) {}
			if (!newTabImages[checksum]) return output;



			const imagePropertyNames = new Set([
				"og:image",
				"og:image:url",
				"og:image:secure_url",
				"twitter:image"
			]);
			for (let imagePropertyName of imagePropertyNames) {
				const value = newTabImages[checksum][imagePropertyName];
				if (!!value) {
					output.image = (new URL(value, url)).toString();
				}
			}

			if (newTabImages[checksum]._manifest) {
				const manifest = newTabImages[checksum]._manifest;
				output.theme_color = manifest.theme_color ?? manifest['theme-color'];
				output.background_color = manifest.background_color;

				const favicon = Array.isArray(manifest.icons) ? manifest.icons.at(0) : null;
				output.favicon = !!favicon ? (new URL(favicon.src, url)).toString() : null;
			}

			return output;
		},
	}, true));



	await reopenTabStateRefresh()
		.catch(console.error)
	;
}

async function fetchSeoMetaData(url) {
	const response = await fetch(url);
	if (!response.ok) return null;

	const metaNameReg = /.+?"?(?:property|name)"?=(?<ogName>"(?:theme-color|(?:og|fb|twitter):[\w:]+?)")/i,
		metaValueReg = /.+?"?content"?=(?<ogValue>".*?")/i
	;
	const pageHtml = (await response.text()) ?? '',
		pageContent = new Map([...pageHtml.match(/<meta.*?\/?>/g)]
			.map(el => {
				const metaName = metaNameReg.exec(el),
					metaValue = metaValueReg.exec(el)
				;
				if (!metaName?.length || !metaValue?.length) return null;
				if (!metaName.groups?.ogName || !metaValue.groups?.ogValue) return null;
				return [JSON.parse(metaName.groups.ogName ?? 'null'), JSON.parse(metaValue.groups.ogValue ?? 'null')];
			})
			.filter(el => !!el)
		)
	;

	const manifest = /<link.+?rel="manifest"\s*href=(?<href>".*?").*?>/i.exec(pageHtml);
	let manifestData = null;
	if (manifest?.groups?.href) {
		try {
			let manifestHref = JSON.parse(manifest.groups.href);
			const response = await fetch(new URL(manifestHref, url));
			if (response.ok) {
				manifestData = await response.json();
			}
		} catch (e) {
			console.error(e);
		}
		pageContent.set('_manifest', manifestData);
	}

	return pageContent.size ? Object.fromEntries(pageContent) : null;
}

if (location.pathname.includes('newTab.html')) {
	loadSpeedDial()
		.catch(console.error)
	;
}

async function onBookmarkChanged() {
	await chrome.storage.local.remove(newTabImagesStorage);
	loadSpeedDial()
		.catch(console.error)
	;
}
chrome.bookmarks.onChanged.addListener(function (id, changeInfo) {
	const links = document.querySelectorAll(`.newTab-section a[href*=${JSON.stringify(changeInfo.url)}]`);
	if (links.length > 0) {
		onBookmarkChanged()
			.catch(console.error)
		;
	}
});



const newTabCustomStylesheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(newTabCustomStylesheet);

async function loadStylesheet() {
	const newTabStylesheet = await getPreference('newTabStylesheet')
		.catch(console.error)
	;
	for (let i = newTabCustomStylesheet.cssRules.length - 1; i >= 0; i--) {
		newTabCustomStylesheet.deleteRule(i);
	}
	if (newTabStylesheet) {
		newTabCustomStylesheet.insertRule(newTabStylesheet);
	}
}

chrome.storage.onChanged.addListener(function (changes, areaName) {
	if (areaName !== 'session') return;

	if (chromeNativeConnectedStorageKey in changes) {
		loadStylesheet()
			.catch(console.error)
		;
	}
});


/**
 *
 * @param {HTMLElement} node
 * @returns {Promise<{ url:string, base64:string }>}
 */
async function generateBookmarkThumbnail(node) {
	const url = node.querySelector('a[href]')?.href;
	if (!url) throw new Error('url')

	const base64 = await generateThumbnail(url)
		.catch(console.error)
	;
	if (!base64) throw new Error('base64')

	const $img = document.createElement('img')
	$img.classList.add('background');
	$img.src = base64;
	node.appendChild($img);
	return {
		url,
		base64,
	};
}

async function fillThumbnails() {
	console.group('fillThumbnails');
	console.time('fillThumbnails');

	const newTabCaptures = {};
	await chrome.storage.local.set({
		[newTabCapturesStorage]: newTabCaptures
	});
	await loadSpeedDial()
		.catch(console.error)
	;

	const $articles = document.querySelectorAll('article.newTab-item:not(:has(img.background))');
	for (let [i, $article] of $articles.entries()) {
		console.info(`Refreshing ${i + 1} of ${$articles.length}...`, $article);
		const result = await generateBookmarkThumbnail($article)
			.catch(console.error)
		;
		if (result) {
			try {
				newTabCaptures[await generateChecksum(result.url, imageUrlAlgorithm)] = result.base64;
				await chrome.storage.local.set({
					[newTabCapturesStorage]: newTabCaptures
				});
			} catch (e) {
				console.error(e);
			}
		}
	}

	console.timeEnd('fillThumbnails');
	console.groupEnd('fillThumbnails');
}
document.addEventListener('click', function onThumbnailRefresh(ev) {
	const el = ev.target.closest('#refreshThumbnails');
	if (!el) return;

	el.disabled = true;
	fillThumbnails()
		.catch(console.error)
		.finally(() => {
			el.disabled = false;
		})
	;
});



/**
 *
 * @param {string} linkUrl
 * @return {Promise<void>}
 */
async function refreshLinkThumbnail(linkUrl) {
	console.debug(`Refreshing ${linkUrl}...`);

	const $article = document.querySelector(`a[href=${JSON.stringify(linkUrl)}]`).parentElement;
	if (!$article) throw new Error('LINK_NOT_FOUND');

	const existingThumbnail = $article.querySelector('img.background');
	if (existingThumbnail) {
		existingThumbnail.remove();
	}

	const result = await generateBookmarkThumbnail($article)
		.catch(console.error)
	;
	if (!result) return;


	const storageResult = await chrome.storage.local.get([
		newTabCapturesStorage
	])
		.catch(console.error)
	;
	const newTabCaptures = storageResult[newTabCapturesStorage] ?? {};
	newTabCaptures[await generateChecksum(result.url, imageUrlAlgorithm)] = result.base64;
	await chrome.storage.local.set({
		[newTabCapturesStorage]: newTabCaptures
	});
}

chrome.runtime.onMessage.addListener(function (message, sender) {
	if (sender.id === chrome.runtime.id && message.name === 'newTab_refreshLinkImage') {
		refreshLinkThumbnail(message.data.linkUrl)
			.catch(console.error)
		;
	}
});
