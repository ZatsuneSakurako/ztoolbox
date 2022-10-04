// https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769#9851769
export const isFirefox = /(?:firefox|fxios)\/(\d+)/i.test(self.navigator.userAgent);
export const isChrome = !isFirefox && !self.navigator.userAgent.toLowerCase().indexOf("chrome") !== -1;
