(function () {
	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

		if (sender.id === chrome.runtime.id && message.name === 'ztoolbox_mutedPause') {
			if (media === null) {
				updateCurrentMedia();
			}

			if (media !== null && message.hasOwnProperty('isMuted') && !(message.isMuted === media.paused)) {
				if (message.isMuted === true) {
					media.pause();
				} else {
					media.play();
				}
			}
		}

		sendResponse(true);
	});





	let media = null;
	const setCurrentMedia = function (node) {
		if (media !== null) {
			// Stop listening old media object
			media.removeEventListener('play', togglePlayEvent);
			media.removeEventListener('pause', togglePlayEvent);
		}

		media = node;
		if (node !== null) {
			// Start listening old media object
			media.addEventListener('play', togglePlayEvent);
			media.addEventListener('pause', togglePlayEvent);
		}
	};

	const togglePlayEvent = function () {
		chrome.runtime.sendMessage({
			'name': 'ztoolbox_mutedPause',
			'isPaused': media.paused === true
		})
	};





	const updateCurrentMedia = function () {
		setCurrentMedia(document.querySelector('video,audio'));
	};
	window.addEventListener('popstate', updateCurrentMedia, true);
	window.addEventListener("hashchange", updateCurrentMedia, true);
	window.document.addEventListener("DOMContentLoaded", updateCurrentMedia);
})();