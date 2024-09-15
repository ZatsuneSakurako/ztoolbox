import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";
import "../utils/onImageError.js";
import {getPreference, getPreferences} from "../classes/chrome-preferences.js";

const newTabImagesStorage = '_newTabImages';

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

	for (let folderName of ['Speed Dial']) {
		const bookmarks = await chrome.bookmarks.search({title: folderName});

		/**
		 *
		 * @type {BookmarkTreeNode[]}
		 */
		const bookmarkTrees = [];
		for (let bookmark of bookmarks) {
			bookmarkTrees.push((await chrome.bookmarks.getSubTree(bookmark.id))?.at(0));
		}

		const item = bookmarkTrees.find(item => item && Array.isArray(item.children));
		if (item) {
			output.set(folderName, item);
		}
	}

	return output;
}

const imageUrlAlgorithm = 'SHA-256';

const newTabCustomStylesheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(newTabCustomStylesheet);
async function initPage() {
	const newTabStylesheet = await getPreference('newTabStylesheet')
		.catch(console.error)
	;
	if (newTabStylesheet) {
		for (let i = newTabCustomStylesheet.cssRules.length - 1; i >= 0; i--) {
			newTabCustomStylesheet.deleteRule(i);
		}
		newTabCustomStylesheet.insertRule(newTabStylesheet);
	}


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
	try {
		newTabImages = (await chrome.storage.local.get(newTabImagesStorage))[newTabImagesStorage];
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

	appendTo($newTabContainer, await renderTemplate('newTab', {
		'bookmarks': Object.fromEntries(data),
		async getMeta(bookmark) {
			const url = bookmark.url,
				checksum = await generateChecksum(url, imageUrlAlgorithm),
				output = {}
			;
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

/**
 *
 * @param {string} string
 * @param {AlgorithmIdentifier} algorithm
 */
function generateChecksum(string, algorithm) {
	const encoder = new TextEncoder();
	const data = encoder.encode(string);
	return crypto.subtle.digest(algorithm, data).then(hash => {
		const hashArray = Array.from(new Uint8Array(hash));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	});
}

if (location.pathname.includes('newTab.html')) {
	initPage()
		.catch(console.error)
	;
}

async function onBookmarkChanged() {
	await chrome.storage.local.remove(newTabImagesStorage);
	location.reload();
}
chrome.bookmarks.onChanged.addListener(function (id, changeInfo) {
	const links = document.querySelectorAll(`.newTab-section a[href*=${JSON.stringify(changeInfo.url)}]`);
	if (links.length > 0) {
		onBookmarkChanged()
			.catch(console.error)
		;
	}
});
