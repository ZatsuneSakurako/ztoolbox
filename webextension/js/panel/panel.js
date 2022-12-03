import {loadTranslations} from '../translation-api.js';
import {renderTemplate} from '../init-templates.js';
import {theme_cache_update} from '../classes/backgroundTheme.js';
import * as tabPageServerIp from "./tabPageServerIp.js";
import {getPreference, savePreference} from "../classes/chrome-preferences.js";
import "./requestPermission.js";



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

	chrome.storage.local.get(['_notificationGloballyDisabled'])
		.then(async ({_notificationGloballyDisabled}) => {
			await chrome.storage.local.set({
				_notificationGloballyDisabled: !_notificationGloballyDisabled
			});

			updatePanelData()
				.catch(console.error)
			;
		})
		.catch(console.error)
	;
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#refreshData');
	if (!elm) return;

	elm.dataset.translateTitle = '';
	elm.disabled = true;
	const triggered = Date.now();

	const {refreshWebsitesData} = await import('../variousFeatures/refresh-data.js');
	refreshWebsitesData()
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

			updatePanelData()
				.catch(console.error)
			;
		})
	;
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#settings');
	if (!elm) return;

	const {showSection} = await import("../classes/chrome-native.js");
	if ((await getPreference('mode')) === 'delegated' && !e.shiftKey) {
		showSection('settings')
			.catch(console.error)
		;
	} else {
		await chrome.runtime.openOptionsPage();
	}
});


chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area !== "local") return;

	if ('mode' in changes) {
		location.reload();
		return;
	}
	if ('check_enabled' in changes) {
		const current = changes.check_enabled.newValue,
			button = document.querySelector('#check_enabled')
		;
		button.dataset.translateTitle = `checkEnabled${current ? '' : '_off'}`;
		button?.classList.toggle('off', !current);
	}
});
document.addEventListener('click', async e => {
	const elm = e.target.closest('#check_enabled');
	if (!elm) return;

	const current = await getPreference('check_enabled');
	await savePreference('check_enabled', !current);
});
document.addEventListener('click', async e => {
	const elm = e.target.closest('#leave_delegated');
	if (!elm) return;

	await savePreference('mode', 'normal');
});


window.theme_update = async function theme_update() {
	let panelColorStylesheet = await theme_cache_update(document.querySelector("#generated-color-stylesheet"));

	if (!!panelColorStylesheet && typeof panelColorStylesheet === "object") {
		console.info("Theme update");

		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.remove();

		document.body.dataset.theme = panelColorStylesheet.dataset.theme;

		document.head.appendChild(panelColorStylesheet);
	}
};

/**
 *
 * @param {Node} node
 */
function removeAllChildren(node) {
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.removeChild(node.lastChild);
	}
}

async function updatePanelData() {
	console.log("Updating panel data");

	tabPageServerIp.updateData()
		.catch(console.error)
	;

	const {_notificationGloballyDisabled} = await chrome.storage.local.get(['_notificationGloballyDisabled']);

	/**
	 *
	 * @type {HTMLButtonElement|null}
	 */
	let disableNotificationsButton = document.querySelector('button#disableNotifications');
	if (disableNotificationsButton) {
		disableNotificationsButton.classList.toggle('off', !!_notificationGloballyDisabled ?? false);
		disableNotificationsButton.dataset.translateTitle = !!_notificationGloballyDisabled? 'GloballyDisabledNotifications' : 'GloballyDisableNotifications';
	}



	if ((await getPreference('mode')) !== 'normal') {
		return;
	}



	let websiteDataList_Node = document.querySelector("#panelContent #refreshItem");
	removeAllChildren(websiteDataList_Node);


	const {loadStoredWebsitesData} = await import('../variousFeatures/refresh-data-loader.js');
	const websitesData = await loadStoredWebsitesData();
	for (let [website, websiteData] of websitesData) {
		const websiteRenderData = {
			"logged": websiteData.logged,
			"count": websiteData.count,
			"website": website,
			"websiteIcon": websiteData.websiteIcon,
			"folders": [],
			"href": websiteData.href,
			"noData": websiteData.logged === null
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

		/**
		 *
		 * @type {HTMLElement}
		 */
		const websiteNode = document.createElement("article");
		websiteDataList_Node.appendChild(websiteNode);
		websiteNode.outerHTML = await renderTemplate("panelCheckedDataItem", websiteRenderData);
	}
}



async function current_version(version) {
	/**
	 *
	 * @type {HTMLSpanElement|null}
	 */
	const current_version_node = document.querySelector("span#current_version");
	if (!current_version_node) return;

	//current_version_node.textContent = version;
	current_version_node.dataset.currentVersion = version;

	const lastCheck = (await chrome.storage.local.get(['_checkUpdate']))?._checkUpdate ?? {};
	current_version_node.dataset.hasUpdate = (lastCheck.hasUpdate ?? false).toString();
	if (!lastCheck.hasUpdate ?? false) {
		// if no update, no text
		current_version_node.dataset.translateTitle = '';
	}
}
current_version(chrome.runtime.getManifest().version)
	.catch(console.error)
;


loadTranslations()
	.catch(console.error)
;

updatePanelData()
	.catch(console.error)
;
