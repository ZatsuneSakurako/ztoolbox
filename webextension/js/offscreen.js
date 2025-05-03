setInterval(async () => {
	try {
		await chrome.runtime.sendMessage({ "type": "service_worker_keepalive" });
	} catch (e) {
		console.error()
	}
}, 25 * 1000);
