/**
 *
 * @type {chrome.webRequest.RequestFilter}
 */
export const webRequestFilter = { urls: ['<all_urls>'], types: ['main_frame'] };

/**
 * Disable userScript runAt "panel" mode because chrome.userScripts.execute is not available
 * @type {boolean}
 */
export const userScriptPanelDisabled = !!chrome.userScripts && typeof chrome.userScripts.execute !== 'function'

export const _userStylesStoreKey = '_userStyles',
	_tabStylesStoreKey = '_tabUserStyles',
	_userStylesStateStoreKey = '_userStylesState',
	_userScriptsStoreKey = '_userScripts',
	_userScriptsStateStoreKey = '_userScriptsState'
;
