export const chromeNativeSettingsStorageKey = '_nativeSettings';
export const chromeNativeConnectedStorageKey = '_nativeConnected';

export async function getElectronSettings() {
	const result = await chrome.storage.local.get([chromeNativeSettingsStorageKey]);
	return result[chromeNativeSettingsStorageKey] ?? {};
}

export async function getSessionNativeIsConnected() {
	const session = (await chrome.storage.session.get([chromeNativeConnectedStorageKey])
		.catch(console.error)) ?? {}
	;

	return !!session[chromeNativeConnectedStorageKey];
}
