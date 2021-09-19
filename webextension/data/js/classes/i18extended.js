'use strict';



class i18extended {
	constructor(currentLanguage) {
		let loadPromise = () => {
			return new Promise(async (resolve, reject) => {
				await import('../lib/i18next.js');
				await import('../lib/i18nextXHRBackend.js');
				// fallback to one language
				i18next.use(i18nextXHRBackend);
				i18next.init({
					lng: 'en',
					backend: {
						// for all available options read the backend's repository readme file
						loadPath: chrome.extension.getURL('/data/js/locales/') + '{{lng}}-{{ns}}.json'
					}
				}, () => {
					i18next.changeLanguage(currentLanguage, err => {
						if (err) {
							Object.defineProperty(this, "loadingState", {
								value: "failed",
								configurable: true,
								writable: false
							});
							reject(false);
						} else {
							Object.defineProperty(this, "loadingState", {
								value: "success",
								configurable: true,
								writable: false
							});
							resolve(true);
						}
					});
				});
			})
		};
		Object.defineProperty(this, "loadingState", {
			value: "loading",
			configurable: true,
			writable: false
		});
		Object.defineProperty(this, "loadingPromise", {
			writable: false,
			value: loadPromise()
		});
	}

	_(key, options){
		if (this.loadingState === "success") {
			return i18next.t(key, options);
		} else {
			return undefined;
		}
	}
}



export {
	i18extended
}