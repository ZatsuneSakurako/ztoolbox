(() => {
	const isFirefox = typeof InstallTrigger !== 'undefined' || /(?:firefox|fxios)\/(\d+)/i.test(navigator.userAgent);
	if (!!isFirefox) {
		return;
	}



	/**
	 *
	 * @type {browser.runtime.Port|null}
	 */
	let eventPort = null;
	let event = null;
	window.addEventListener("beforeinstallprompt", function(e) {
		// log the platforms provided as options in an install prompt
		event = e;
		if (!!eventPort) {
			eventPort.postMessage(!!event);
			eventPort.disconnect();
			eventPort = null;
		}
	});


	async function notify() {
		// Let's check whether notification permissions have already been granted
		if (Notification.permission !== "granted") {
			await Notification.requestPermission();
		}

		if (Notification.permission !== "granted") {
			return null;
		}

		return new Notification("Z-Toolbox - Pwa Install", {
			requireInteraction: true
		});
	}

	const onConnect = async function (port) {
		if (port.sender.id !== chrome.runtime.id) {
			return;
		}

		if (port.name === 'ztoolbox_detect-pwa') {
			port.postMessage(!!event);

			if (!!eventPort) {
				eventPort.disconnect();
				eventPort = null;
			}

			if (!!event) {
				port.disconnect();
			} else {
				eventPort = port;
			}

			return;
		}

		if (port.name !== 'ztoolbox_trigger-pwa') {
			return;
		}

		if (!event) {
			port.postMessage('no_pwa_event');
			return;
		}

		const notification = await notify();

		const onClose = () => {
			setTimeout(() => {
				notification.close();
				port.postMessage('dismissed_notification');
				port.disconnect();
			})
		};
		notification.onclick = async () => {
			notification.onclose = undefined;
			notification.close();

			try {
				await event.prompt();
			} catch (e) {
				console.error(e);
				port.postMessage(e);
				port.disconnect();
				return;
			}

			const choiceResult = await event.userChoice;
			port.postMessage(choiceResult);
			port.disconnect();
		};
		notification.onclose = onClose;
	};

	chrome.runtime.onConnect.addListener(function (port) {
		onConnect(port)
			.catch(console.error)
		;
	});
})()