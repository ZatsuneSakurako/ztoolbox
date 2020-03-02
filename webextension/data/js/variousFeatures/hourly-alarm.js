'use strict';
const i18ex = window.i18ex;

class HourlyAlarm {
	constructor() {
		if(getPreference('hourlyAlarm')===true){
			this.enableHourlyAlarm();
		} else {
			this.disableHourlyAlarm();
		}

		function actionOnAlarm(alarm) {
			const msg = i18ex._('timeIsNow', {
				//currentTime: new Date(alarm.scheduledTime).toLocaleTimeString()
				currentTime: moment().format(i18ex._('displayTimeFormat'))
			});

			if(appGlobal['notificationGlobalyDisabled']===false){
				doNotif({
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
		browser.alarms.onAlarm.addListener(actionOnAlarm);
	}

	async enableHourlyAlarm(){
		ZDK.console.info("Enabling hourly alarm...");

		let haveAlreadyAlarm;

		try {
			haveAlreadyAlarm = await HourlyAlarm.isEnabledHourlyAlarm();
		} catch (e){
			haveAlreadyAlarm = null;
		}

		if (haveAlreadyAlarm === null || haveAlreadyAlarm === true) {
			await browser.alarms.clear('hourlyAlarm');

			if (await HourlyAlarm.isEnabledHourlyAlarm() === false) {
				ZDK.console.info('Cleaned old hourly alarm');
			} else {
				ZDK.console.warn('Problem cleaning old hourly alarm!');
			}
		}

		browser.alarms.create('hourlyAlarm', {
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
		ZDK.console.info('Disabling hourly alarm...');
		return await browser.alarms.clear('hourlyAlarm');
	}
}

const hourlyAlarm = new HourlyAlarm();
