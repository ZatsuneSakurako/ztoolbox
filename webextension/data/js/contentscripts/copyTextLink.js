'use strict';

(function(){

let linkText;
document.addEventListener('contextmenu', function(event) {
	linkText = event.target.innerText;
});



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
		try {
			sendResponse({string: linkText});
		} catch (err) {
			console.error(err);
		}
	}
});

})();
