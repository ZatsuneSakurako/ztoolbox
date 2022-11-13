'use strict';

const ALARM_NAME = 'CHROME_NOTIFICATION_CONTROLLER';



let chromeAPI_button_availability = true;
const chromeNotifications = new Map();
browser.notifications.onClicked.addListener(function(notificationId){
	if(chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId).fn === "function"){
		chromeNotifications.get(notificationId).fn("onClicked");
	}
});
if (browser.notifications.onButtonClicked) {
	browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
		if (chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId).fn === "function") {
			chromeNotifications.get(notificationId).fn('onButtonClicked', buttonIndex);
		}
	});
}
const onShownSupported = browser.notifications.hasOwnProperty('onShown');
if (onShownSupported === true) {
	browser.notifications.onShown.addListener(notificationId => {
		console.info(`Notification "${notificationId}" shown.`);
		if (chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId).fnOnShown === "function") {
			chromeNotifications.get(notificationId).fnOnShown();
		}
	})
}
browser.notifications.onClosed.addListener((notificationId, byUser=false)=>{
	if (byUser === true && chromeNotifications.has(notificationId)) {
		chromeNotifications.get(notificationId).isClosed = true;
	}
});



async function initAlarm() {
	await browser.alarms.clear(ALARM_NAME);
	browser.alarms.create(ALARM_NAME, {
		'periodInMinutes': 0.25
	});
}
browser.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === ALARM_NAME) {
		browser.notifications.getAll()
			.then(activeNotifications => {
				chromeNotifications.forEach((notifTimer, notificationId) => {
					if (activeNotifications.hasOwnProperty(notificationId) === false) {
						if (typeof chromeNotifications.get(notificationId).fn === 'function') {
							chromeNotifications.get(notificationId).fn((chromeNotifications.get(notificationId).isClosed) ? 'closed' : 'timeout');
						} else {
							console.warn(`${notifId} has timed out but data problem.`);
						}
					}
				});
			})
		;
	}
});
initAlarm()
	.catch(console.error)
;



/**
 * @typedef {object} ChromeNotificationControllerObject
 * @property {string} triggeredType
 * @property {string} notificationId
 * @property {number} buttonIndex
 */
/**
 *
 * @param options Options from chrome.notifications.NotificationOptions
 * @param {null|(NotificationOptions & {id:string})} [customOption]
 * @param {Object} customOption.soundObject
 * @param {String} customOption.soundObject.data
 * @param {Number} customOption.soundObjectVolume
 * @return {Promise<ChromeNotificationControllerObject>}
 */
function sendNotification(options=null, customOption=null) {
	const sendNotification = (options) => {
		return new Promise((resolve, reject) => {
			const onError = (error) => {
				if(error && typeof error.message === 'string' && (error.message === 'Adding buttons to notifications is not supported.' || error.message.indexOf("\"buttons\"") !== -1)){
					chromeAPI_button_availability = false;
					console.debug("Buttons not supported, retrying notification without them.");
					if(options.buttons){
						delete options.buttons;
					}

					browser.notifications.create(options)
						.then(resolve)
						.catch(onError)
					;
				} else {
					reject(error);
				}
			};
			try{
				if (!!options.id) {
					const id = options.id;
					delete options.id;
					browser.notifications.create(id, options)
						.then(resolve)
						.catch(onError)
					;
				} else {
					browser.notifications.create(options)
						.then(resolve)
						.catch(onError)
					;
				}
			} catch(err) {
				onError(err);
			}
		})
	};
	return new Promise((resolve, reject) => {
		if (typeof options !== 'object' || options === null) {
			reject('Missing argument');
		}
		if (!options.type || typeof options.type !== 'string') {
			options.type = 'basic';
		}
		if (!options.contextMessage || typeof options.contextMessage !== 'string') {
			options.contextMessage = browser.runtime.getManifest().name;
		}
		if (!options.isClickable || typeof options.isClickable !== 'boolean') {
			options.isClickable = true;
		}
		if (!chromeAPI_button_availability && options.buttons) {
			delete options.buttons;
		}

		let sound = null;
		sendNotification(options)
			.then(notificationId => {
				console.debug( `Notification "${notificationId}" created.`);
				if (customOption !== null && typeof customOption.soundObject === 'object' && customOption.soundObject !== null && typeof customOption.soundObject.data === 'string') {
					sound = new Audio(customOption.soundObject.data);
					sound.volume = customOption.soundObjectVolume / 100;
					if (onShownSupported === false) {
						sound.play();
					}
				}

				chromeNotifications.set(notificationId, {
					"isClosed": false,
					"fn": (triggeredType, buttonIndex = null) => {
						clear(notificationId);

						if (sound !== null) {
							sound.currentTime = 0;
							sound.pause();
						}

						if (
							triggeredType === 'timeout'
							||
							triggeredType === 'closed'
							||
							(
								(chromeAPI_button_availability === true && options.hasOwnProperty('buttons') === true && typeof buttonIndex !== 'number')
								||
								(chromeAPI_button_availability === false && buttonIndex !== null)
							)
						) {
							reject({
								'triggeredType': triggeredType,
								'notificationId': notificationId,
								'buttonIndex': buttonIndex
							});
						} else {
							// 0 is the first button, used as button of action
							resolve({
								'triggeredType': triggeredType,
								'notificationId': notificationId,
								'buttonIndex': buttonIndex
							});
						}
					},
					'fnOnShown': () => {
						if (sound !== null && onShownSupported === true) {
							sound.play();
						}
					}
				});
			})
			.catch(error => {
				if (sound !== null) {
					sound.currentTime = 0;
					sound.pause();
				}
				reject(error);
			})
		;
	});
}

function clear(notificationId = null) {
	if (notificationId !== null && chromeNotifications.has(notificationId)) {
		browser.notifications.clear(notificationId);
		chromeNotifications.delete(notificationId);
		return true;
	}
	return false;
}



export {
	sendNotification
}