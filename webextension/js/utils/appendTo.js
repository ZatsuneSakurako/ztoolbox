'use strict';

/**
 *
 * @param {Element|string} html
 */
function htmlToElements(html) {
	return (typeof html === 'object')? [html] : new DOMParser().parseFromString(html, 'text/html').body.childNodes;
}

/**
 * @param {Element|string} selector
 * @param {Element|string} html
 * @returns {null | HTMLElement[]}
 */
export function replaceWith(selector, html) {
	const nodes = htmlToElements(html),
		target = (typeof selector === 'object')? selector : document.querySelector(selector);

	if (target === null) {
		return null;
	}

	target.replaceWith(...nodes);
	return Array.from(nodes);
}

/**
 * @param {Element|string} selector
 * @param {Element|string} html
 * @returns {null | HTMLElement[]}
 */
export function appendTo(selector, html) {
	const nodes = htmlToElements(html),
		target = (typeof selector === 'object')? selector : document.querySelector(selector),
		output = []
	;

	if (target === null) {
		return null;
	}

	for (let [i, node] of Array.from(nodes.entries())) {
		output[i] = target.appendChild(node);
	}
	return output;
}

