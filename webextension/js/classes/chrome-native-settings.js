export const chromeNativeSettingsStorageKey = '_nativeSettings';
export const chromeNativeConnectedStorageKey = '_nativeConnected';

export async function getElectronSettings() {
	return (await chrome.storage.local.get([chromeNativeSettingsStorageKey])) ?? {};
}

export async function getSessionNativeIsConnected() {
	const session = (await chrome.storage.session.get([chromeNativeConnectedStorageKey])
		.catch(console.error)) ?? {}
	;

	return !!session[chromeNativeConnectedStorageKey];
}
