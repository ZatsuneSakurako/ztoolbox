import {loadTranslations} from '../translation-api.js';
import * as tabUserStyles from "./tabUserStyles.js";
import {chromeNativeConnectedStorageKey, getSessionNativeIsConnected} from "../classes/chrome-native-settings.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";

document.addEventListener('click', e => {
	const elm = e.target.closest('[role="button"]');
	if (!elm) return;

	if (elm.classList.contains('disabled')) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#settings');
	if (!elm) return;

	const nativeIsConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	if (nativeIsConnected) {
		chrome.runtime.sendMessage({
			id: 'showSection',
			data: 'settings'
		}).catch(console.error);
	}
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#refreshUserStyles');
	if (!elm) return;

	chrome.runtime.sendMessage(chrome.runtime.id, {
		id: 'refreshUserStyles',
	})
		.catch(console.error)
		.finally(() => {
			window.close();
		});
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#openDelegatedMain');
	if (!elm) return;

	const nativeIsConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	if (nativeIsConnected) {
		chrome.runtime.sendMessage({
			id: 'showSection',
			data: 'main'
		}).catch(console.error);
	}
});


chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area !== "session") return;

	if (chromeNativeConnectedStorageKey in changes) {
		location.reload();
	}
});

async function updatePanelData() {
	console.log("Updating panel data");

	const activeTab = await getCurrentTab();
	tabUserStyles.updateData(activeTab)
		.catch(console.error)
	;
}



async function current_version(version) {
	/**
	 *
	 * @type {HTMLSpanElement|null}
	 */
	const current_version_node = document.querySelector("span#current_version");
	if (!current_version_node) return;

	current_version_node.textContent = ` (v${version})`;

	const {env} = await import("../env.js");
	if (env === 'local') {
		const nativeConnected = !!(await chrome.storage.session.get(['_nativeConnected']))?._nativeConnected,
			hasUpdate = nativeConnected && !!(await chrome.storage.local.get(['_checkUpdate']))?._checkUpdate;

		current_version_node.dataset.hasUpdate = hasUpdate.toString();

		if (!hasUpdate) {
			// if no update (or not local), no text
			current_version_node.dataset.translateTitle = '';
		}
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
