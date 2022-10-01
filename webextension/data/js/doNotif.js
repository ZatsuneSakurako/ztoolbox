import {i18ex} from "./translation-api.js";
import {sendNotification} from "./classes/chrome-notification-controller.js";

/**
 *
 * @param {NotificationOptions} options
 * @param suffixConfirmIfNoButtons
 * @return {Promise<ChromeNotificationControllerObject>}
 */
export function doNotif(options, suffixConfirmIfNoButtons=false) {
	return new Promise((resolve, reject) => {
		if (typeof options !== "object" || options === null) {
			reject("Missing argument");
			return null;
		}
		if (!options.title || typeof options.title !== "string" || options.title === "") {
			options.title = browser.runtime.getManifest().name;
		}
		if (!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === "") {
			const manifestIcons = browser.runtime.getManifest().icons;
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

		if (suffixConfirmIfNoButtons === true){
			options.title = `${options.title} (${i18ex._("click_to_confirm")})`;
		}

		let customOptions = null;
		if (options.hasOwnProperty("soundObject") && options.hasOwnProperty("soundObjectVolume")) {
			customOptions = {
				"soundObject": options.soundObject,
				"soundObjectVolume": options.soundObjectVolume
			};
			delete options.soundObject;
			delete options.soundObjectVolume;
		}

		sendNotification(options, customOptions)
			.then(result => {
				const {triggeredType, notificationId, buttonIndex} = result;
				console.info(`${notificationId}: ${triggeredType}${(buttonIndex && buttonIndex !== null)? ` (Button index: ${buttonIndex})`:""}`);

				// 0 is the first button, used as button of action
				if (buttonIndex === null || buttonIndex === 0) {
					resolve(result);
				} else {
					reject(result);
				}
			})
			.catch(err => {
				reject(err);
			})
		;
	});
}