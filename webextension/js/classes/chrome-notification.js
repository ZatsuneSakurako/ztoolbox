'use strict';

const ALARM_NAME = 'CHROME_NOTIFICATION_CONTROLLER',
	NOTIFICATION_STORAGE_ID = '_notification'
;



let chromeAPI_button_availability = true;

/**
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/NotificationOptions
 * @param {object} options Options from chrome.notifications.NotificationOptions
 * @param {NotificationData&object} [data]
 * @return {Promise<string>}
 */
async function sendNotification(options, data) {
	if (typeof options !== 'object' || options === null) {
		throw new Error('MISSING_ARGUMENT');
	}
	if (!options.type || typeof options.type !== 'string') {
		options.type = 'basic';
	}
	if (!options.title || typeof options.title !== 'string') {
		options.title = chrome.runtime.getManifest().name;
	}
	if (!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === "") {
		const manifestIcons = chrome.runtime.getManifest().icons;
		let iconSize;
		if (manifestIcons.hasOwnProperty("128")) {
			iconSize = "128";
		} else if (manifestIcons.hasOwnProperty("96")) {
			iconSize = "96";
		} else if (manifestIcons.hasOwnProperty("64")) {
			iconSize = "64";
		} else if (manifestIcons.hasOwnProperty("48")) {
			iconSize = "48";
		} else if (manifestIcons.hasOwnProperty("32")) {
			iconSize = "32";
		}

		if (iconSize !== undefined) {
			options.iconUrl = manifestIcons[iconSize];
		}
	}
	if (!options.contextMessage || typeof options.contextMessage !== 'string') {
		options.contextMessage = chrome.runtime.getManifest().name;
	}
	if (!options.isClickable || typeof options.isClickable !== 'boolean') {
		options.isClickable = true;
	}
	if (!chromeAPI_button_availability && options.buttons) {
		delete options.buttons;
	}

	// Generate id if none provided
	const id = options.id ?? crypto.randomUUID();
	if ('id' in options) {
		delete options.id;
	}

	await chrome.storage.session.set({
		[NOTIFICATION_STORAGE_ID]: {
			...data,
			onButtonClickAutoClose: data.onButtonClickAutoClose ?? true,
			onClickAutoClose: data.onClickAutoClose ?? true,
			createdAt: (new Date()).toISOString()
		}
	});

	let error;
	try {
		await chrome.notifications.create(id, options);
	} catch (e) {
		error = e;
	}

	if (!error) {
		return id;
	}

	if (error && typeof error.message === 'string' && (error.message === 'Adding buttons to notifications is not supported.' || error.message.indexOf("\"buttons\"") !== -1)) {
		chromeAPI_button_availability = false;
		console.debug("Buttons not supported, retrying notification without them.");
		if (options.buttons) {
			delete options.buttons;
		}

		await chrome.notifications.create(id, options);
		return id;
	} else {
		throw new Error(error);
	}
}

/**
 * @typedef {object} NotificationData
 * @property {boolean} onButtonClickAutoClose
 * @property {boolean} onClickAutoClose
 */
/**
 *
 * @param {string} id
 * @return {Promise<NotificationData&object|undefined>}
 */
export async function getNotificationData(id) {
	const notificationsData = await getAndClearNotificationData();
	return notificationsData[id];
}



async function getAndClearNotificationData() {
	const notificationsData = (await chrome.storage.session.get(NOTIFICATION_STORAGE_ID) ?? {})[NOTIFICATION_STORAGE_ID];

	for (let [notificationId, data] of Object.entries(notificationsData)) {
		const comparaisonDate = new Date(data.createdAt);
		comparaisonDate.setMinutes(comparaisonDate.getMinutes() + 5);

		if (Date.now() > comparaisonDate.valueOf()) {
			delete notificationsData[notificationId];
		}
	}

	await chrome.storage.session.set({
		[NOTIFICATION_STORAGE_ID]: notificationsData
	});

	return notificationsData;
}
chrome.notifications.onButtonClicked.addListener(async function (notificationId, buttonIndex) {
	const data = await getNotificationData(notificationId);
	let autoClose = false;
	if (!!data && typeof data === 'object' && !!data.onButtonClickAutoClose) {
		autoClose = true;
		chrome.notifications.clear(notificationId);
	}

	console.log(`Notification ${notificationId} was clicked (button n°${buttonIndex}${autoClose ? ', auto-close' : ''}).`);
});
chrome.notifications.onClicked.addListener(async function (notificationId) {
	const data = await getNotificationData(notificationId);
	let autoClose = false;
	if (!!data && typeof data === 'object' && !!data.onClickAutoClose) {
		autoClose = true;
		chrome.notifications.clear(notificationId);
	}

	console.log(`Notification ${notificationId} was clicked${autoClose ? ' (auto-close)' : ''}.`);
})
chrome.notifications.onClosed.addListener(function (notificationId) {
	console.log(`Notification ${notificationId} has closed.`);
	getAndClearNotificationData()
		.catch(console.error)
	;
});



chrome.alarms.onAlarm.addListener(function (alarm) {
	if (alarm.name === ALARM_NAME) {
		chrome.alarms.clear(ALARM_NAME)
			.catch(console.error)
		;
	}
});



export {
	sendNotification
}