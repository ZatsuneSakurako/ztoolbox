'use strict';
import '../lib/i18next.js';
import '../lib/i18nextHttpBackend.js';


export class i18extended {
	constructor() {
		let loadPromise = () => {
			return new Promise(async (resolve, reject) => {
				// fallback to one language
				i18next.use(i18nextHttpBackend);
				i18next.init({
					lng: 'en',
					backend: {
						// for all available options read the backend's repository readme file
						loadPath: chrome.runtime.getURL('/data/js/locales/') + '{{lng}}-{{ns}}.json'
					}
				}, async () => {
					let language;
					if (chrome.i18n.getMessage) {
						try {
							language = browser.i18n.getMessage('language');
						} catch (e) {
							console.error(e);
						}
					}
					if (!language && browser.i18n.getUILanguage) {
						try {
							language = browser.i18n.getUILanguage();
						} catch (e) {
							console.error(e);
						}
					}

					const languages = new Set(
						!!language ?
							[language]
							:
							[
								...await browser.i18n.getAcceptLanguages()
							]
								.map(lang => {
									const mainLang = lang.toLowerCase().split('-')[0];
									if (mainLang) {
										return mainLang;
									}
								})
								.filter(lang => !lang.includes('-'))
					);

					let loaded = false;
					for (let currentLanguage of languages) {
						if (currentLanguage.includes('-')) {
							// Ignore languages with a '-'
							continue;
						}

						const result = await this.changeLanguage(currentLanguage);
						if (!!result) {
							loaded = true;
							break;
						}
					}

					if (!loaded) {
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

	/**
	 *
	 * @param {string} language
	 * @return {Promise<boolean>}
	 */
	changeLanguage(language) {
		return new Promise(resolve => {
			i18next.changeLanguage(language, (err) => {
				resolve(!err);
			})
		})
	}

	_(key, options){
		if (this.loadingState === "success") {
			return i18next.t(key, options);
		} else {
			return undefined;
		}
	}
}
