'use strict';
import {getPreference} from '../classes/chrome-preferences-2.js';
import {i18ex} from '../translation-api.js';

const HOURLY_ALARM_NAME = 'hourlyAlarm';
export class HourlyAlarm {
	constructor() {
		getPreference('hourlyAlarm')
			.then(value => {
				if (value === true) {
					this.enableHourlyAlarm();
				} else {
					this.disableHourlyAlarm();
				}
			})
			.catch(console.error)
		;
	}

	async actionOnAlarm(alarm) {
		if (alarm.name !== HOURLY_ALARM_NAME) {
			return
		}


		const msg = i18ex._('timeIsNow', {
			// currentTime: new Date(alarm.scheduledTime).toLocaleTimeString()
			currentTime: new Intl.DateTimeFormat(i18ex._('language'), { timeStyle: 'short' }).format(new Date(alarm.scheduledTime))
		});

		if (!localStorage.getItem('notificationGloballyDisabled')) {
			doNotif({
				"id": "hourly-alarm",
				'message': msg,
				'soundObject': await getPreference('hourlyAlarm_sound'),
				'soundObjectVolume': await getPreference('hourlyAlarm_sound_volume')
			});

			if (await getPreference('notify_vocal')) {
				const timeStr = new Intl.DateTimeFormat(i18ex._('language'), { hour: 'numeric' }).format(new Date());
				if (i18ex._('language') === 'fr') {
					timeStr.replace(/\s*h$/i, ' heure')
				}

				import('../voiceAPI.js')
					.then(({voiceReadMessage}) => {
						voiceReadMessage(i18ex._('language'), i18ex._('timeIsNow', {
							currentTime: timeStr
						}));
					})
					.catch(console.error)
				;
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

		const date = new Date();
		date.setHours(date.getHours() + 1);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		browser.alarms.create(HOURLY_ALARM_NAME, {
			'when': date.valueOf(),
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

async function init() {
	if (!window.hourlyAlarm) {
		await i18ex.loadingPromise;
		window.hourlyAlarm = new HourlyAlarm();
	}
}
init()
	.catch(console.error)
;

browser.alarms.onAlarm.addListener(async function (alarm) {
	if (alarm.name === HOURLY_ALARM_NAME) {
		await init()
			.catch(console.error)
		;
		hourlyAlarm.actionOnAlarm(alarm)
			.catch(console.error)
		;
	}
});
