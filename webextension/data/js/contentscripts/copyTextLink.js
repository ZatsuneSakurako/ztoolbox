'use strict';

(function(){

let linkText;
document.addEventListener('contextmenu', function(event) {
	linkText = event.target.innerText;
});

async function copyToClipboard(string) {
	try {
		await navigator.clipboard.writeText(string);
		return true;
	} catch (e) {
		console.error(e);
		return false;
	}
}

/**
 *
 * @param {string} id
 * @param {object} data
 */
function sendToMain(id, data) {
	chrome.runtime.sendMessage(chrome.runtime.id, {
		id,
		data: data
	}, function () {
		console.log('[CopyTextLink]', arguments);
	});
}


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		return;
	}



	let messageData = null;
	if (typeof message == "string") {
		try {
			messageData = JSON.parse(message);
		} catch (err) {}
	} else if (typeof message === "object") {
		messageData = message
	}
	if (messageData === null) {
		return;
	}



	if (messageData.id === "copyLinkText") {
		copyToClipboard(linkText)
			.then(result => {
				sendToMain('copyLinkText_reply', {result, string: linkText});
			})
			.catch(err => {
				console.error(err);
				sendToMain('copyLinkText_reply', {result: false, string: linkText});
			})
		;
	}
});

})();
