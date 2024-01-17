import chalk from "chalk";

/**
 *
 * @param {string} msg
 */
export function error(msg) {
	return console.log(chalk.bold.red(msg));
}

/**
 *
 * @param {string} msg
 */
export function warning(msg) {
	return console.log(chalk.yellow(msg));
}

/**
 *
 * @param {string} msg
 */
export function info(msg) {
	return console.log(chalk.blueBright(msg));
}

/**
 *
 * @param {string} msg
 */
export function success(msg) {
	return console.log(chalk.green(msg));
}
