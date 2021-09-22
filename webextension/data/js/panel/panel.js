import {ZDK} from '../classes/ZDK.js';
import {loadTranslations} from '../options-api.js';
import {renderTemplate} from '../init-templates.js';
import {copyToClipboard} from '../copyToClipboard.js';
import {theme_cache_update} from '../backgroundTheme.js';
import {WebsiteData} from "../variousFeatures/website-data.js";



const sendDataToMain = function (id, data=null) {
	browser.runtime.sendMessage({
		id,
		data
	})
};

let notificationGloballyDisabled, websitesData;
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.hasOwnProperty("url")) {
		console.debug(`Receiving message from: ${sender.url} (${sender.id})`);
	}

	if (chrome.runtime.id !== sender.id) {
		console.error('Message received from unknown sender id');
	} else if (typeof message === "object" && message.hasOwnProperty("data")) {
		if (message.id === 'mainToPanel_panelData') {
			notificationGloballyDisabled = message.data.notificationGloballyDisabled;
			websitesData = new Map(
				message.data.websitesData
					.map(data => {
						data[1] = WebsiteData.fromJSON(data[1]);
						return data;
					})
			);
			document.dispatchEvent(new CustomEvent('freshRssDataUpdate', {
				detail: websitesData.get('freshRss')
			}));
			updatePanelData()
				.catch(console.error)
			;
		}
	}
});

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

	browser.runtime.sendMessage({
		id: 'btn_notificationGloballyDisabled',
		data: null
	})
		.catch(console.error)
	;
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#refreshData');
	if (!elm) return;

	elm.dataset.translateTitle = '';
	elm.disabled = true;
	const triggered = Date.now();

	browser.runtime.sendMessage({
		id: 'refreshWebsitesData',
		data: null
	})
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

			browser.runtime.sendMessage({
				id: "doNotif",
				data: {
					options: {
						'id': 'copied_title_text',
						"message": (clipboardResult) ? i18ex._("copied_title_text") : i18ex._("error_copying_to_clipboard")
					}
				}
			})
				.catch(console.error)
			;
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
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));

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

async function updatePanelData() {
	console.log("Updating panel data");

	let disableNotificationsButton = document.querySelector('#disableNotifications');
	disableNotificationsButton.classList.toggle('off', notificationGloballyDisabled);
	if (disableNotificationsButton.dataset.opentipId) {
		disableNotificationsButton.dataset.translateTitle = notificationGloballyDisabled? 'GloballyDisabledNotifications' : 'GloballyDisableNotifications';
	}

	let websiteDataList_Node = document.querySelector("#panelContent #refreshItem");
	removeAllChildren(websiteDataList_Node);

	for (let [website, websiteData] of websitesData) {
		let websiteRenderData = {
			"logged": websiteData.logged,
			"count": websiteData.count,
			"website": website,
			"websiteIcon": websiteData.websiteIcon,
			"folders": [],
			"href": websiteData.href
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
		websiteNode.outerHTML = await renderTemplate("panelCheckedDataItem", websiteRenderData);
	}
}





document.addEventListener('click', e => {
	const node = e.target.closest('#panelContent .websiteItem .folder[data-folder-url]');
	if (!node) return;

	e.stopPropagation();
	ZDK.openTabIfNotExist(node.dataset.folderUrl)
		.catch(console.error)
	;
	return false;
});



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
current_version(browser.runtime.getManifest().version);


loadTranslations();

sendDataToMain("panel_onload");
