(function () {
	browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
		if (getPreference('muted_pause_enabled') === true && changeInfo.hasOwnProperty('mutedInfo') && changeInfo.mutedInfo.reason) {
			let muted = changeInfo.mutedInfo.muted;

			browser.tabs.sendMessage(tab.id, {
				'name': 'ztoolbox_mutedPause',
				'isMuted': muted
			})
				.catch(err => {
					consoleMsg("error", err);
				})
			;
		}
	});



	browser.runtime.onMessage.addListener(function (message, sender) {
		if (getPreference('muted_pause_enabled') === true && sender.id === chrome.runtime.id && message.name && message.name === 'ztoolbox_mutedPause') {
			if (message.isPaused === false && !!sender.tab && sender.tab.mutedInfo.muted === true) {
				browser.tabs.update(sender.tab.id, {
					'muted': false
				})
					.catch(err => {
						consoleMsg("error", err);
					})
				;
			}

		}
	});
})();
