import { loadTranslations } from '../options-api.js';
import {copyToClipboard} from '../copyToClipboard.js';



const backgroundPage = browser.extension.getBackgroundPage(),
	{appGlobal, ZDK} = backgroundPage,
	{websites, websitesData, mustacheTemplates} = appGlobal
;

const sendDataToMain = function (id, data) {
	appGlobal.sendDataToMain("ZToolBox_Panel", id, data);
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
		.catch(console.error)
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
				'id': 'copied_title_text',
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
		.catch(console.error)
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





document.addEventListener('click', e => {
	const node = e.target.closest('#panelContent .websiteItem .folder[data-folder-url]');
	if (!node) return;

	e.stopPropagation();
	backgroundPage.openTabIfNotExist(node.dataset.folderUrl)
		.catch(console.error)
	;
	return false;
});

document.addEventListener('click', e => {
	const node = e.target.closest('#panelContent .websiteItem');
	if (!node) return;

	e.stopPropagation();

	let website = node.dataset.website,
		websiteAPI = websites.get(website),
		websiteData = websitesData.get(website),

		href = websiteAPI[(node.dataset.logged) ? "getViewURL" : "getLoginURL"](websiteData)
	;

	if (href === undefined) {
		console.warn('No links', node);
		return false;
	}

	backgroundPage.openTabIfNotExist(href)
		.catch(console.error)
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
