export const chromeNativeSettingsStorageKey = '_nativeSettings';
export async function getElectronSettings() {
	return (await chrome.storage.local.get([chromeNativeSettingsStorageKey])) ?? {};
}