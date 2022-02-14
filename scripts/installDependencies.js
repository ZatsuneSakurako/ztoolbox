import fs from "fs-extra";
import path from "path";

import {cp} from "./common/file-operations.js";
import {info, error} from "./common/custom-console.js";
import {projectRootDir} from "./projectRootDir.js";

const fontPath = path.join(projectRootDir, './webextension/data/font/'),
	jsLib = path.join(projectRootDir, './webextension/data/js/lib/')
;

/**
 *
 * @param {string} src
 * @param {string} dest
 * @private
 */
function _cp(src, dest) {
	return cp(path.join(projectRootDir, src), dest);
}


const exist_jsLib = fs.pathExistsSync(jsLib);
if (!exist_jsLib) {
	error("JS lib folder not found!");
	process.exit(1);
} else {
	info("Copying mustache...");
	_cp("./node_modules/mustache/mustache.js", jsLib);

	info("Copying webextension-polyfill...");
	_cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js", jsLib);
	_cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js.map", jsLib);

	info("Copying i18next...");
	_cp("./node_modules/i18next/i18next.js", jsLib);

	info("Copying i18next-http-backend...");
	_cp("./node_modules/i18next-http-backend/i18nextHttpBackend.js", jsLib);

	info("Copying MaterialIcons (marella/material-icons)...");
	_cp("./node_modules/material-icons/iconfont/material-icons.woff2", path.normalize(`${fontPath}/MaterialIcons-Regular.woff2`));
}
