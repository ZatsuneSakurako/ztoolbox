// https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769#9851769
export const isFirefox = typeof InstallTrigger !== 'undefined' || /(?:firefox|fxios)\/(\d+)/i.test(navigator.userAgent);
export const isChrome = !window.navigator.userAgent.toLowerCase().indexOf("chrome") !== -1;
