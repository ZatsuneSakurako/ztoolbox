const HOURLY_ALARM_NAME = 'hourlyAlarm';
browser.alarms.onAlarm.addListener(async function (alarm) {
	if (alarm.name === HOURLY_ALARM_NAME) {
		browser.alarms.clear(HOURLY_ALARM_NAME)
			.catch(console.error)
		;
	}
});