'use strict';
const i18ex = window.i18ex;

const HOURLY_ALARM_NAME = 'hourlyAlarm';
class HourlyAlarm {
	constructor() {
		if (getPreference('hourlyAlarm') === true) {
			this.enableHourlyAlarm();
		} else {
			this.disableHourlyAlarm();
		}
	}

	actionOnAlarm(alarm) {
		if (alarm.name !== HOURLY_ALARM_NAME) {
			return
		}

		const msg = i18ex._('timeIsNow', {
			//currentTime: new Date(alarm.scheduledTime).toLocaleTimeString()
			currentTime: moment().format(i18ex._('displayTimeFormat'))
		});

		if(appGlobal['notificationGlobalyDisabled']===false){
			doNotif({
				"id": "hourly-alarm",
				'message': msg,
				'soundObject': getPreference('hourlyAlarm_sound'),
				'soundObjectVolume': getPreference('hourlyAlarm_sound_volume')
			});

			if(getPreference('notify_vocal')){
				voiceReadMessage(i18ex._('language'), i18ex._('timeIsNow', {
					currentTime: moment().format(i18ex._('spokenTimeFormat'))
				}));
			}
		}
	}

	async enableHourlyAlarm(){
		console.info("Enabling hourly alarm...");

		let haveAlreadyAlarm;

		try {
			haveAlreadyAlarm = await HourlyAlarm.isEnabledHourlyAlarm();
		} catch (e){
			haveAlreadyAlarm = null;
		}

		if (haveAlreadyAlarm === null || haveAlreadyAlarm === true) {
			await browser.alarms.clear(HOURLY_ALARM_NAME);

			if (await HourlyAlarm.isEnabledHourlyAlarm() === false) {
				console.info('Cleaned old hourly alarm');
			} else {
				console.warn('Problem cleaning old hourly alarm!');
			}
		}

		browser.alarms.create(HOURLY_ALARM_NAME, {
			'when': moment().startOf('hour').add(1, 'h').valueOf(), // moment#valueOf is just like Date#valueOf (which is Like Date#getTime)
			'periodInMinutes': 60
		});
	}

	static async isEnabledHourlyAlarm() {
		const retrievedData = await browser.alarms.get('hourlyAlarm');

		if (Array.isArray(retrievedData) && retrievedData.length >= 2) {
			throw "Several alarms found!";
		} else {
			return !(retrievedData === undefined || (Array.isArray(retrievedData) && retrievedData.length === 0));
		}
	}

	async disableHourlyAlarm() {
		console.info('Disabling hourly alarm...');
		return await browser.alarms.clear('hourlyAlarm');
	}
}

window.baseRequiredPromise.then(async function() {
	window.hourlyAlarm = new HourlyAlarm();
});

browser.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === HOURLY_ALARM_NAME) {
		hourlyAlarm.actionOnAlarm(alarm);
	}
});
