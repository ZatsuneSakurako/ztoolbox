(function () {
	'use strict';

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		if (sender.id === chrome.runtime.id && message.name === 'ztoolbox_iqdb_launch_search') {
			try {
				const result = iqdb_search(message.imgUrl);
				sendResponse({
					response: result,
					isError: false
				});
			} catch (e) {
				console.error(e);
				sendResponse({
					response: e,
					isError: true
				});
			}
		}
	});



	const iqdb_search = function iqdb_search(imgUrl) {
		if (typeof imgUrl !== 'string' || imgUrl.length === 0) {
			throw 'InvalidUrl';
		}

		const $url = document.querySelector('#url');
		$url.value = imgUrl;
		$url.form.submit();

		return true;
	}
})();