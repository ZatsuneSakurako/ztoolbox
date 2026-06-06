// Inside content.js, inside the setInterval:
let lastTimeSent = 0;

setInterval(() => {
	const now = Date.now();

	// Only send it if at least 20 seconds passed since last SEND (not last receive)
	if (now - lastTimeSent < 20_000) return;

	chrome.runtime.sendMessage({
		type: "HEARTBEAT",
		data: {
			[Math.random().toString(36)]: new Date().getTime(),
		}
	})
		.then(() => {
			lastTimeSent = now;
		});
}, 1_000); // Run the check every second, but only ACT every 5 seconds
