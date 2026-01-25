'use strict';

import {getPreferences} from './chrome-preferences.js';
import {chromeNativeConnectedStorageKey} from "./chrome-native-settings.js";

class Color {
	constructor(hexColorCode){
		const getCodes =  /^#([\da-fA-F]{2,2})([\da-fA-F]{2,2})([\da-fA-F]{2,2})$/;
		if(getCodes.test(hexColorCode)){
			const result = getCodes.exec(hexColorCode);
			this.R= parseInt(result[1],16);
			this.G= parseInt(result[2],16);
			this.B= parseInt(result[3],16);
		}
	}

	// noinspection JSUnusedGlobalSymbols
	rgbCode() {
		return "rgb(" + this.R + ", " + this.G + ", " + this.B + ")";
	}

	/* RGB to HSL function from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion/9493060#9493060 */
	getHSL(){
		let r = this.R;let g = this.G;let b = this.B;
		
		r /= 255; g /= 255; b /= 255;
		let max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;

		if (max === min) {
			h = s = 0; // achromatic
		} else {
			let d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return {"H": h * 360, "S": s * 100 + "%", "L": l * 100 + "%"};
	}
}

export const THEME_LS_PREF_CACHE_KEY = '__theme_pref_cache';
/**
 *
 * @type {HTMLLinkElement|null}
 */
let themeStylesheetNode = null;
/**
 *
 * @param {string} [currentTheme]
 * @param {string} [background_color]
 * @return {Promise<void>}
 */
export async function theme_update(currentTheme, background_color) {
	if (!themeStylesheetNode) {
		themeStylesheetNode = document.querySelector('#theme-stylesheet');
	}

	if (currentTheme === undefined && background_color === undefined) {
		let optionCache = null;
		if (self.localStorage) {
			try {
				optionCache = JSON.parse(self.localStorage.getItem(THEME_LS_PREF_CACHE_KEY));

				currentTheme = optionCache.theme;
				background_color = optionCache.background_color;
			} catch (e) {
				console.error(e);
			}
		}

		(async () => {
			const options = await getPreferences("theme", "background_color");

			currentTheme = options.get("theme") ?? 'dark';
			background_color = options.get("background_color") ?? '#000000';
			theme_update(currentTheme, background_color)
				.catch(console.error);

			if (self.localStorage) {
				localStorage.setItem(THEME_LS_PREF_CACHE_KEY, JSON.stringify({
					theme: currentTheme,
					background_color: background_color,
				}));
			}
		})().catch(console.error)
		if (!currentTheme || !background_color) {
			return;
		}
	}

	const baseColor = new Color(background_color),
		baseColor_hsl = baseColor.getHSL(),
		baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100
	;
	let values;
	if (currentTheme === "dark") {
		if (baseColor_L > 0.5 || baseColor_L < 0.25) {
			values = ['35%', '25%', '45%'];
		} else {
			values = [`${baseColor_L * 100}%`, `${(baseColor_L - 0.1) * 100}%`, `${(baseColor_L + 0.15) * 100}%`];
		}
	} else if (currentTheme === "light") {
		if (baseColor_L < 0.5 || baseColor_L > 0.75) {
			values = ['65%', '40%', '80%'];
		} else {
			values = [`${baseColor_L * 100}%`, `${(baseColor_L - 0.25) * 100}%`, `${(baseColor_L + 0.25) * 100}%`];
		}
	}

	const primary = values[0],
		primaryDark = values[1],
		primaryLight = values[2],
		invBaseColor_hue = (baseColor_hsl.H - 360/2 * ((baseColor_hsl.H < 360/2)? 1 : -1)),
		invBaseColor_light = (currentTheme === "dark")? "77%" : "33%";

	const root = document.documentElement;
	root.classList.toggle('light', currentTheme === 'light');
	root.style.setProperty('--primary-color', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${primary})`);
	root.style.setProperty('--primary-color-dark', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${primaryDark})`);
	root.style.setProperty('--primary-color-light', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${primaryLight})`);
	root.style.setProperty('--InvColor', `hsl(${invBaseColor_hue}, ${baseColor_hsl.S}, ${invBaseColor_light})`);

	if (themeStylesheetNode && themeStylesheetNode.dataset.background_color) {
		themeStylesheetNode.dataset.background_color = background_color;
	}
}

chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area === "session" && chromeNativeConnectedStorageKey in changes) {
		theme_update()
			.catch(console.error)
		;
	}
	if (area === "local" && ("theme" in changes || "background_color" in changes)) {
		theme_update()
			.catch(console.error)
		;
	}
});
