'use strict';

/**
 * @param {Element|string} selector
 * @param {Element|string} html
 * @param {HTMLDocument|Document} doc
 * @returns {null | HTMLElement[]}
 */
export function appendTo(selector, html, doc=document) {
	const nodes = (typeof html === 'object')? [html] : new DOMParser().parseFromString(html, 'text/html').body.childNodes,
		target = (typeof selector === 'object')? selector : doc.querySelector(selector),
		output = []
	;

	if (target === null) {
		return null;
	}

	for (let i in nodes) {
		if (nodes.hasOwnProperty(i)) {
			const node = nodes[i];
			output[i] = target.appendChild(node);
		}
	}
	return output;
}

