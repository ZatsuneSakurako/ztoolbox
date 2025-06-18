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

	if (themeStylesheetNode !== null && currentTheme === themeStylesheetNode.dataset.theme && background_color === themeStylesheetNode.dataset.background_color) {
		console.info("Loaded theme is already good");
		return;
	} else if (themeStylesheetNode && currentTheme !== themeStylesheetNode.dataset.theme) {
		console.info("Changing stylesheet href");
		themeStylesheetNode.href = themeStylesheetNode.href.replace(/-(dark|light)/i, `-${currentTheme}`);
		themeStylesheetNode.dataset.theme = currentTheme;
	}


	if (themeStylesheetNode && background_color === themeStylesheetNode.dataset.background_color) {
		console.info("Theme color is already good");
	}


	const baseColor = new Color(background_color),
		baseColor_hsl = baseColor.getHSL(),
		baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100
	;
	let values;
	if (currentTheme === "dark") {
		if (baseColor_L > 0.5 || baseColor_L < 0.1) {
			values = ["19%","13%","26%","13%"];
		} else {
			values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
		}
	} else if (currentTheme === "light") {
		if (baseColor_L < 0.5 /*|| baseColor_L > 0.9*/) {
			values = ["87%","74%","81%","87%"];
		} else {
			values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
		}
	}

	const light0 = values[0],
		light1 = values[1],
		light2 = values[2],
		light3 = values[3],
		invBaseColor_hue = (baseColor_hsl.H - 360/2 * ((baseColor_hsl.H < 360/2)? 1 : -1)),
		invBaseColor_light = (currentTheme === "dark")? "77%" : "33%";

	const root = document.documentElement;
	root.style.setProperty('--bgLight0', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${light0})`);
	root.style.setProperty('--bgLight1', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${light1})`);
	root.style.setProperty('--bgLight2', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${light2})`);
	root.style.setProperty('--bgLight2_Opacity', `hsla${baseColor_hsl.H}, ${baseColor_hsl.S}, ${light2}, 0.95)`);
	root.style.setProperty('--bgLight3', `hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${light3})`);
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
