import {appendTo} from "../utils/appendTo.js";
import {nunjuckRender} from "../init-templates.js";
import "./onImageError.js";
import {getPreference} from "../classes/chrome-preferences.js";
import {chromeNativeConnectedStorageKey} from "../classes/chrome-native-settings.js";
import {generateThumbnail} from "../utils/captureScreenshot.js";
import './newTab-reopenTab.js';
import {reopenTabStateRefresh} from "./newTab-reopenTab.js";
import {BookmarksResolver} from "./BookmarksResolver.js";
import {newTabImagesStorage, newTabCapturesStorage} from "./newTab-settings.js";

const imageUrlAlgorithm = 'SHA-256';

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

	const newTabFolders = (await getPreference('newTab_folders')) ?? ['Speed Dial'];
	for (let folderName of newTabFolders) {
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



	/**
	 *
	 * @type { Dict<{ capture?: string, _hostname?: string|null, image?: string, theme_color?: string, background_color?: string, favicon?: string }> }
	 */
	const bookmarksMeta = {};

	/**
	 *
	 * @type {Map<string, string|null|Promise<string>>}
	 */
	/**
	 *
	 * @type {Map<string, Dict<string | null>|null>}
	 */
	const newImages = newTabImages ? new Map(Object.entries(newTabImages)) : new Map();
	if (data) {
		/**
		 *
		 * @param {Map<string, chrome.bookmarks.BookmarkTreeNode>} bookmarks
		 * @return {Promise<void>}
		 */
		const loadBookmarksMetaData = async function(bookmarks) {
			const promises = [];

			for (let bookmark of bookmarks.values()) {
				if (bookmark.children) {
					promises.push(loadBookmarksMetaData(bookmark.children));
				}

				if (!bookmark.url) continue;
				bookmark.checksum = await generateChecksum(bookmark.url, imageUrlAlgorithm);
				if (bookmark.checksum in bookmarksMeta) continue;

				const existingData = newImages.get(bookmark.checksum);
				if (existingData !== undefined) {
					bookmarksMeta[bookmark.checksum] = existingData;
					continue;
				} else {
					const seoMetaData = await fetchSeoMetaData(bookmark.url)
						.catch(console.error);
					newImages.set(bookmark.checksum, seoMetaData ?? null);
				}

				const output = bookmarksMeta[bookmark.checksum] = {};
				output._hostname = null;
				try {
					output._hostname = new URL(bookmark.url).hostname;
				} catch (_) {}

				if (!newTabImages[bookmark.checksum]) continue;

				const imagePropertyNames = new Set([
					"og:image",
					"og:image:url",
					"og:image:secure_url",
					"twitter:image"
				]);
				for (let imagePropertyName of imagePropertyNames) {
					const value = newTabImages[bookmark.checksum][imagePropertyName];
					if (!!value) {
						output.image = (new URL(value, bookmark.url)).toString();
					}
				}

				if (newTabImages[bookmark.checksum]._manifest) {
					const manifest = newTabImages[bookmark.checksum]._manifest;
					output.theme_color = manifest.theme_color ?? manifest['theme-color'];
					output.background_color = manifest.background_color;

					const favicon = Array.isArray(manifest.icons) ? manifest.icons.at(0) : null;
					output.favicon = !!favicon ? (new URL(favicon.src, bookmark.url)).toString() : null;
				}

				newTabImages[bookmark.checksum] = output;
			}

			await Promise.allSettled(promises);
		};

		await loadBookmarksMetaData(data)
			.catch(console.error);

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



	// Copy node list as we are removing them
	for (let child of [...$newTabContainer.children]) {
		child.remove();
	}



	const result = await nunjuckRender('newTab', {
		'bookmarks': [...data.entries()],
		bookmarksMeta,
		newTabCaptures,
	}, true);
	appendTo($newTabContainer, result);



	await reopenTabStateRefresh()
		.catch(console.error)
	;
}

/**
 *
 * @param {string} url
 * @return {Promise<Dict<string|null>|null>}
 */
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
		loadSpeedDial()
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

document.addEventListener('change', function (ev) {
	const el = ev.target.closest('input[name="newTab-folders"][type="radio"]');
	if (!el) return;

	const inputs = document.querySelectorAll('input[name="newTab-folders"][type="radio"]');
	for (let input of inputs) {
		for (let label of input.labels) {
			label.classList.toggle('checked', input.checked);
		}
	}

	const openedFolders = document.querySelectorAll('article.newTab-item.folder.active');
	for (let newTabItem of openedFolders) {
		newTabItem.classList.remove('active');
	}
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


document.addEventListener('click', function (ev) {
	const el = ev.target.closest('article.newTab-item.folder');
	if (!el) return;

	console.dir(el);
	el.classList.toggle('active');
});
