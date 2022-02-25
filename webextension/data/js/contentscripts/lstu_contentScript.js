(function () {
	'use strict';

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		if (sender.id !== chrome.runtime.id) {
			return;
		}

		switch (message.name) {
			case 'framalink_view_copy':
				try {
					const result = shortenerCopy();
					sendResponse({
						response: !!result,
						isError: !result
					});
				} catch (e) {
					console.error(e);
					sendResponse({
						response: e,
						isError: true
					});
				}
				break;
			case 'framalink_view_launch':
				try {
					const result = shortenerForm(message.targetUrl);
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
				break;
		}
	});


	/**
	 *
	 * @return {boolean}
	 */
	const shortenerCopy = function shortenerCopy() {
		const urlInput = document.querySelector('form[method="POST"][action="/a"] + * #input-short');
		if (urlInput && urlInput.value) {
			const btn = urlInput.parentElement.querySelector(':scope #clipboard');
			if (btn) {
				btn.click();
				return true;
			}
		}
		return false;
	};

	/**
	 *
	 * @return {string|undefined}
	 */
	const shortenerForm = function shortenerForm(url) {
		const urlInput = document.querySelector('form[method="POST"][action="/a"] input[type="url"]');
		urlInput.value = url;
		urlInput.form.submit();
		return urlInput.form.action;
	};

	return true;
})();