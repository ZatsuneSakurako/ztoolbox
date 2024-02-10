import fs from "fs-extra";
import path from "path";

import {cp} from "./common/file-operations.js";
import {info, error} from "./common/custom-console.js";
import {projectRootDir} from "./projectRootDir.js";

const fontPath = path.join(projectRootDir, './webextension/assets/fonts/'),
	jsLib = path.join(projectRootDir, './webextension/lib/')
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
	info("Copying twing...");
	_cp("./node_modules/twig/twig.min.js", jsLib);
	_cp("./node_modules/twig/twig.min.js.map", jsLib);

	info("Copying i18next...");
	_cp("./node_modules/i18next/i18next.min.js", jsLib);

	info("Copying i18next-http-backend...");
	_cp("./node_modules/i18next-http-backend/i18nextHttpBackend.js", jsLib);

	info("Copying MaterialIcons (marella/material-icons)...");
	_cp("./node_modules/material-icons/iconfont/material-icons.woff2", path.normalize(`${fontPath}/MaterialIcons-Regular.woff2`));

	info("Copying ip-regex...");
	_cp("./node_modules/ip-regex/index.js", path.normalize(`${jsLib}/ip-regex.js`));

	info("Copying qr-creator...");
	_cp("./node_modules/qr-creator/dist/qr-creator.es6.min.js", path.normalize(`${jsLib}/qr-creator.es6.min.js`));
}
