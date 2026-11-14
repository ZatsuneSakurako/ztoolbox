'use strict';
export const port = chrome.runtime.connect(chrome.runtime.id, {
	name: 'panel',
});