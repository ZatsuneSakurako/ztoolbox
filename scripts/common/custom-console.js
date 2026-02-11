import {styleText} from "node:util";

/**
 *
 * @param {string} msg
 */
export function error(msg) {
	return console.log(styleText(['bold', 'red'], msg));
}

/**
 *
 * @param {string} msg
 */
export function warning(msg) {
	return console.log(styleText('yellow', msg));
}

/**
 *
 * @param {string} msg
 */
export function info(msg) {
	return console.log(styleText('blueBright', msg));
}

/**
 *
 * @param {string} msg
 */
export function success(msg) {
	return console.log(styleText('green', msg));
}
