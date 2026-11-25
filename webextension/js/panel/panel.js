import * as tabUserStyles from "./tabUserStyles.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";
import {port} from "./panel-port.js";

document.addEventListener('click', e => {
	const elm = e.target.closest('[role="button"]');
	if (!elm) return;

	if (elm.classList.contains('disabled')) {
		e.preventDefault();
		e.stopImmediatePropagation();
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

/**
 *
 * @param {string} url
 */
function openProtocolAndClose(url) {
	let closed = false;
	const close = () => {
		if (closed) return;
		closed = true;
		window.close();
	};

	window.location.href = url;

	// The protocol dialog / external app steals focus -> we get blur.
	// Give the OS a beat to actually complete the hand-off, then close.
	window.addEventListener('blur', () => setTimeout(close, 500), { once: true });

	// When the user comes back (app opened, dialog dismissed), close too.
	window.addEventListener('focus', close, { once: true });

	// Safety net in case no blur/focus ever happens.
	setTimeout(close, 1_500);
}

document.addEventListener('click', e => {
	const elm = e.target.closest('#openDelegatedMain,#settings');
	if (!elm) return;

	e.preventDefault();
	openProtocolAndClose(elm.href);
});

port.onMessage.addListener(async function onMessage(message) {
	if (!message || typeof message !== 'object') throw new Error('MESSAGE_SHOULD_BE_AN_OBJECT');

	if (message.id === 'isConnected') {
		location.reload();
	}
});

const activeTab = await getCurrentTab();
tabUserStyles.updateData(activeTab)
	.catch(console.error);
