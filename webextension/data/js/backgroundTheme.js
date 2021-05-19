'use strict';

import {getPreference} from './options-api.js';
import {default as env} from './env.js';

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

/**
 *
 * @param {HTMLStyleElement|null} [colorStylesheetNode]
 * @return {Promise<HTMLStyleElement|null>}
 */
export async function theme_cache_update(colorStylesheetNode) {
	const currentTheme = getPreference("panel_theme"),
		background_color = getPreference("background_color")
	;

	const _cacheStr = window.localStorage.getItem('backgroundPage_theme_cache') ?? null;
	let _cache = null;
	if (!!_cacheStr && ['0', 'false'].includes(_cacheStr) === false) {
		try {
			_cache = JSON.parse(_cacheStr);
		} catch (e) {
			console.error(e);
			_cache = null;
		}
	}

	if (!!_cache) {
		if (_cache.version !== browser.runtime.getManifest().version) {
			_cache = null;
		} else if (env === 'local' && new Date().toLocaleDateString() !== new Date(_cache._createdAt).toLocaleDateString()) {
			_cache = null;
		}
	}

	if (_cache !== null && colorStylesheetNode !== null && currentTheme === _cache.theme && background_color === _cache.background_color) {
		if (currentTheme === colorStylesheetNode.dataset.theme && background_color === colorStylesheetNode.dataset.background_color) {
			console.info("Loaded theme is already good");
			return null;
		} else {
			console.info("Using localStorage theme cache");

			const styleElement = document.createElement("style");
			styleElement.id = "generated-color-stylesheet";
			styleElement.textContent = _cache.style;
			styleElement.dataset.theme = currentTheme;
			styleElement.dataset.background_color = background_color;
			return styleElement.cloneNode(true);
		}
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


	if (!window.Mustache) {
		await import('./lib/mustache.js');
	}
	if (!window.appGlobal) {
		window.backgroundPage = await browser.runtime.getBackgroundPage();
		window.appGlobal = backgroundPage.appGlobal;
		await backgroundPage.baseRequiredPromise;
	}
	const style = Mustache.render(appGlobal.mustacheTemplates.get("backgroundTheme"), {
		"isDarkTheme": (currentTheme === "dark"),
		"isLightTheme": (currentTheme === "light"),
		"baseColor_hsl": baseColor_hsl,
		"light0": values[0],
		"light1": values[1],
		"light2": values[2],
		"light3": values[3],
		"invBaseColor_hue": ''+(baseColor_hsl.H - 360/2 * ((baseColor_hsl.H < 360/2)? 1 : -1)),
		"invBaseColor_light": (currentTheme === "dark")? "77%" : "33%"
	});

	window.localStorage.setItem('backgroundPage_theme_cache',
		JSON.stringify({
			_createdAt: new Date().toISOString(),
			theme: currentTheme,
			background_color: background_color,
			style: style,
			version: browser.runtime.getManifest().version
		})
	);

	const styleElement = document.createElement("style");
	styleElement.id = "generated-color-stylesheet";
	styleElement.textContent = style;
	styleElement.dataset.theme = currentTheme;
	styleElement.dataset.background_color = background_color;
	//console.log(baseColor.rgbCode());
	return styleElement.cloneNode(true);
}
