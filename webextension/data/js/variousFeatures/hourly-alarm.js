class HourlyAlarm {
	constructor() {
		if(getPreference("hourlyAlarm")===true){
			this.enableHourlyAlarm();
		} else {
			this.disableHourlyAlarm();
		}

		function actionOnAlarm(alarm) {
			const msg = i18ex._("timeIsNow", {
				currentTime: new Date(alarm.scheduledTime).toLocaleTimeString()
			});

			if(appGlobal["notificationGlobalyDisabled"]===false){
				doNotif({
					"message": msg,
					"soundObject": getPreference("hourlyAlarm_sound"),
					"soundObjectVolume": getPreference("hourlyAlarm_sound_volume")
				});

				if(getPreference("notify_vocal")){
					voiceReadMessage(i18ex._("language"), i18ex._("timeIsNow", {
						currentTime: moment(new Date(alarm.scheduledTime)).format(i18ex._("spokenTimeFormat"))
					}));
				}
			}
		}
		browser.alarms.onAlarm.addListener(actionOnAlarm);
	}

	async enableHourlyAlarm(){
		consoleMsg("info", "Enabling hourly alarm...");

		let haveAlreadyAlarm;

		try {
			haveAlreadyAlarm = await HourlyAlarm.isEnabledHourlyAlarm();
		} catch (e){
			haveAlreadyAlarm = null;
		}

		if(haveAlreadyAlarm===null || haveAlreadyAlarm===true){
			await browser.alarms.clear("hourlyAlarm");

			if(await HourlyAlarm.isEnabledHourlyAlarm()===false){
				consoleMsg("info", "Cleaned old hourly alarm");
			} else {
				consoleMsg("warn", "Problem cleaning old hourly alarm!");
			}
		}

		browser.alarms.create("hourlyAlarm", {
			"when": roundDate(new Date(), "Minutes").getTime(),
			"periodInMinutes": 60
		});
	}

	static async isEnabledHourlyAlarm() {
		const retrievedData = await browser.alarms.get("hourlyAlarm");

		if(Array.isArray(retrievedData) && retrievedData.length>=2){
			throw "Several alarms found!";
		} else {
			return !(retrievedData===undefined || (Array.isArray(retrievedData) && retrievedData.length===0));
		}
	}

	async disableHourlyAlarm() {
		consoleMsg("info", "Disabling hourly alarm...");
		return await browser.alarms.clear("hourlyAlarm");
	}
}

const roundDate = (function () {
	const dateElements = [
			"FullYear",
			"Month",
			"Date",
			"Hours",
			"Minutes",
			"Seconds",
			"Milliseconds"
		];

	const getDateElement = function (date, dateElementPosition) {
		if(dateElementPosition <= 0){
			throw "Wrong date element to round.";
		}

		return Date.prototype["get"+dateElements[dateElementPosition]].call(date);
	};

	const setDateElement = function (date, dateElementPosition, newValue) {
		if(dateElementPosition <= 0){
			throw "Wrong date element to round.";
		}

		return Date.prototype["set"+dateElements[dateElementPosition]].call(date, newValue);
	};

	return function(date, dateElement){
		if(!(date instanceof Date)){
			throw "First argument must be a date";
		}

		const dateElementPosition = dateElements.indexOf(dateElement);

		if(dateElementPosition <= 0){
			throw "Wrong date element to round.";
		}

		setDateElement(date, dateElementPosition-1, getDateElement(date, dateElementPosition - 1) + 1);
		for(let i=dateElementPosition; i<dateElement.length; i++){
			setDateElement(date, i, 0);
		}

		return date;
	}
})();

const hourlyAlarm = new HourlyAlarm();
