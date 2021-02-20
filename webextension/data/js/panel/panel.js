import { loadTranslations } from '../options-api.js';
import {copyToClipboard} from '../copyToClipboard.js';



const backgroundPage = browser.extension.getBackgroundPage(),
	{appGlobal, ZDK} = backgroundPage,
	{websites, websitesData, mustacheTemplates} = appGlobal
;

let sendDataToMain = function (id, data) {
	appGlobal.sendDataToMain("ZToolBox_Panel", id, data);
};

const appendTo = function (sel, html, doc=document) {
	return backgroundPage.zDK.appendTo(sel, html, doc);
};
const insertBefore = function (sel, html, doc=document) {
	return backgroundPage.zDK.insertBefore(sel, html, doc);
};


document.addEventListener('click', e => {
	const elm = e.target.closest('[role="button"]');
	if (!elm) return;

	if (elm.classList.contains('disabled')) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#disableNotifications');
	if (!elm) return;

	let disableNotificationsButton = document.querySelector('#disableNotifications');
	appGlobal['notificationGlobalyDisabled'] = !appGlobal['notificationGlobalyDisabled'];
	disableNotificationsButton.classList.toggle('off', backgroundPage.appGlobal['notificationGlobalyDisabled']);

	if (disableNotificationsButton.dataset.opentipId) {
		disableNotificationsButton.dataset.translateTitle = (backgroundPage.appGlobal['notificationGlobalyDisabled'])? 'GloballyDisabledNotifications' : 'GloballyDisableNotifications';
	}
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#refreshStreams');
	if (!elm) return;

	elm.dataset.translateTitle = '';
	elm.disabled = true;
	const triggered = Date.now();

	appGlobal.refreshWebsitesData()
		.catch(ZDK.console.error)
		.finally(() => {
			if (Date.now() - triggered > 2500) {
				elm.dataset.translateTitle = "Refresh";
				elm.disabled = false;
			} else {
				setTimeout(() => {
					elm.dataset.translateTitle = "Refresh";
					elm.disabled = false;
				}, 3000);
			}

			updatePanelData();
		})
	;
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#copyTabTitle');
	if (!elm) return;

	browser.tabs.query({
		active: true,
		currentWindow: true
	})
		.then(async tabs => {
			const [tab] = tabs;
			let clipboardResult = false;
			if (tab && tab.title) {
				clipboardResult = await copyToClipboard(tab.title);
			}

			backgroundPage.doNotif({
				"message": (clipboardResult) ? backgroundPage.i18ex._("copied_title_text") : backgroundPage.i18ex._("error_copying_to_clipboard")
			});
		})
		.catch(console.error)
	;
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#settings');
	if (!elm) return;

	browser.runtime.openOptionsPage()
		.catch(ZDK.console.error)
	;
});


window.theme_update = function theme_update() {
	let panelColorStylesheet = backgroundPage.backgroundTheme.theme_cache_update(document.querySelector("#generated-color-stylesheet"));

	if (typeof panelColorStylesheet === "object" && panelColorStylesheet !== null) {
		console.info("Theme update");

		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.remove();

		document.querySelector("body").dataset.theme = panelColorStylesheet.dataset.theme;

		document.querySelector("head").appendChild(panelColorStylesheet);
	}
};

function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.removeChild(node.lastChild);
	}
}

function updatePanelData() {
	console.log("Updating panel data");

	let websiteDataList_Node = document.querySelector("#panelContent #refreshItem");
	removeAllChildren(websiteDataList_Node);

	websitesData.forEach((websiteData, website) => {
		let websiteRenderData = {
			"logged": websiteData.logged,
			"count": websiteData.count,
			"website": website,
			"websiteIcon": websiteData.websiteIcon,
			"folders": []
		};

		if (websiteData.logged) {
			websiteData.folders.forEach((folderData, folderName) => {
				let count = folderData.folderCount;
				if (typeof count === "number" && !isNaN(count) && count > 0) {
					let folderRenderData = {
						"folderCount": count,
						"folderTitle": (typeof folderData.folderName === "string") ? folderData.folderName : folderName
					};

					if (typeof folderData.folderUrl === "string" && folderData.folderUrl !== "") {
						folderRenderData.folderHaveUrl = true;
						folderRenderData.folderUrl = folderData.folderUrl;
					}
					websiteRenderData.folders.push(folderRenderData);
				}
			});
		}

		let websiteNode = document.createElement("article");
		websiteDataList_Node.appendChild(websiteNode);
		websiteNode.outerHTML = backgroundPage.Mustache.render(mustacheTemplates.get("panelCheckedDataItem"), websiteRenderData);
	});
}





let tabPort = null;
async function loadRss() {
	return new Promise(async (resolve, reject) => {
		const win = await browser.windows.getCurrent({
			'populate': true,
			'windowTypes': ['normal']
		});
		if (tabPort !== null) {
			tabPort.disconnect();
			tabPort = null;
		}



		if (win !== undefined) {
			const tabs = win.tabs.filter(tab => {
				return tab.hasOwnProperty('active') && tab.active === true;
			});

			if (tabs.length > 0) {
				const tab = tabs[0];

				tabPort = browser.tabs.connect(tab.id, {
					'name': 'ztoolbox_rss-retrieve'
				});

				tabPort.onDisconnect.addListener((p) => {
					if (!/^https?:\/\//.test(tab.url)) {
						const lastError = browser.runtime.lastError;
						if (!!lastError && typeof lastError === 'object' && !!lastError.message && lastError.message.indexOf("Could not establish connection") !== -1) {
							reject('InvalidPage');
						}
					}

					if (p.error) {
						console.log(`Disconnected due to an error: ${p.error.message}`);
					}
				});

				tabPort.onMessage.addListener(rssLinks => {
					const title = backgroundPage.zDK.customTitleForConsole('RSS');
					console.log(title[0], title[1], JSON.stringify(rssLinks));
					resolve(rssLinks);
				});
			} else {
				reject('NoActiveTab');
			}
		} else {
			reject('NoCurrentWindow');
		}
	});
}

async function updateDisplayedRss() {
	const websiteDataList_Node = document.querySelector("#panelContent #rssItem");
	removeAllChildren(websiteDataList_Node);

	let tmpNodes = null;
	let loadDelay = setTimeout(() => {
		tmpNodes = appendTo(websiteDataList_Node, backgroundPage.Mustache.render(mustacheTemplates.get("panelRssLinks"), {
			'rssLinks': [],
			'error': 'loading',
			'errorInfo': 'reloadTabs'
		}));

		loadDelay = setTimeout(() => {
			tmpNodes[0].classList.remove('rssItem--hideData');
		}, 1500);
	}, 500);



	let rssLinks, error, renderData;

	try {
		rssLinks = await loadRss();
	} catch (e) {
		console.error(e);
		error = e;
	}

	if (typeof rssLinks !== 'undefined' && Array.isArray(rssLinks)) {
		renderData = {
			'rssLinks': rssLinks,
			'error': ''
		};
	} else {
		let errorMsg = 'rssSomeError';

		if (error !== undefined && error === 'InvalidPage') {
			errorMsg = 'rssForbidenPage';
		}

		renderData = {
			'rssLinks': [],
			'error': errorMsg
		};
	}



	clearTimeout(loadDelay);
	if (tmpNodes !== null) {
		tmpNodes.forEach(node => {
			node.remove()
		});
	}
	appendTo(websiteDataList_Node, backgroundPage.Mustache.render(mustacheTemplates.get("panelRssLinks"), renderData));
}

const onTabChange = _.debounce(() => {
	updateDisplayedRss()
		.catch(err => {
			console.error(err);
		})
	;
}, 100, {
	maxWait: 200
});
browser.windows.onFocusChanged.addListener(onTabChange);
browser.tabs.onActivated.addListener(onTabChange);
browser.runtime.onMessage.addListener(function (data, sender) {
	if (sender.id === browser.runtime.id && data.hasOwnProperty('name') && data.name === 'ztoolbox_rss-retrieve' && sender.tab && sender.tab.active === true) {
		onTabChange();
	}
});
onTabChange();





document.addEventListener('click', e => {
	const node = e.target.closest('#panelContent .websiteItem .folder[data-folder-url]');
	if (!node) return;

	e.stopPropagation();
	backgroundPage.openTabIfNotExist(node.dataset.folderUrl)
		.catch(ZDK.console.error)
	;
	return false;
});

document.addEventListener('click', e => {
	const node = e.target.closest('#panelContent .websiteItem');
	if (!node) return;

	e.stopPropagation();
	let href;
	if (node.classList.contains('rssItem')) {
		href = node.dataset.href;
	} else {
		let website = node.dataset.website,
			websiteAPI = websites.get(website),
			websiteData = websitesData.get(website)
		;

		href = websiteAPI[(node.dataset.logged)? "getViewURL" : "getLoginURL"](websiteData);
	}

	if (href === undefined) {
		ZDK.console.warn('No links', node);
		return false;
	}

	backgroundPage.openTabIfNotExist(href)
		.catch(ZDK.console.error)
	;

	return false;
});
backgroundPage.panel__UpdateData = (data) => {
	updatePanelData(data);
};



function current_version(version) {
	let current_version_node = document.querySelector("#current_version");
	//current_version_node.textContent = version;
	current_version_node.dataset.currentVersion = version;
	current_version_node.dataset.hasUpdate = !!localStorage.getItem('checkUpdate_state');
	if (!localStorage.getItem('checkUpdate_state')) {
		// if no update, no text
		current_version_node.dataset.translateTitle = '';
	}
}
current_version(appGlobal["version"]);


loadTranslations();

sendDataToMain("panel_onload");
