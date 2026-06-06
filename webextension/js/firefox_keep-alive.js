// Inside content.js, inside the setInterval:
let lastTimeSent = 0;

setInterval(() => {
	const now = Date.now();

	// Only send it if at least 5 seconds passed since last SEND (not last receive)
	if (now - lastTimeSent < 5000) return;

	const currentData = {
		[Math.random().toString(36)]: new Date().getTime(),
	};

	chrome.runtime.sendMessage({
		type: "HEARTBEAT",
		data: { ...currentData, missed_ticks: 0 } // Add logic to detect gaps if needed
	})
		.then(() => {
			lastTimeSent = now;
		});
}, 1_000); // Run the check every second, but only ACT every 5 seconds
