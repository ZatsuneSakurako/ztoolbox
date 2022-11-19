export const chromeNativeSettingsStorageKey = '_nativeSettings';
export async function getElectronSettings() {
	return (await browser.storage.local.get([chromeNativeSettingsStorageKey])) ?? {};
}