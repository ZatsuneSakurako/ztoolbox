/**
 *
 * @returns {string|undefined}
 */
export function getIcon() {
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
	return manifestIcons[iconSize];
}

/**
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/NotificationOptions
 * @param { {id?: string, title?: string, contextMessage?: string, iconUrl?: string} } options
 * @return {chrome.notifications.NotificationCreateOptions}
 */
export function getBasicNotificationOptions(options) {
	/**
	 *
	 * @type {chrome.notifications.NotificationCreateOptions}
	 */
	const notificationOpts = {
		type: 'basic',
		id: options.id ?? crypto.randomUUID(),
	};
	if (!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === "") {
		const iconUrl = getIcon();
		if (iconUrl !== undefined) {
			options.iconUrl = iconUrl;
		}
	}
	if (!options.title || typeof options.title !== 'string') {
		options.title = chrome.runtime.getManifest().name;
	}
	if (!options.contextMessage || typeof options.contextMessage !== 'string') {
		options.contextMessage = chrome.runtime.getManifest().name;
	}
	return notificationOpts;
}
