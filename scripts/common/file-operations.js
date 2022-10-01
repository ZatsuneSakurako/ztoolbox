import fs from "fs-extra";
import path from "path";

/**
 * Copy `src` to `dest`, in Promise way.
 * @param {string} src
 * @param {string} dest
 * @return {void}
 */
export function cp(src, dest) {
	if(fs.lstatSync(dest).isDirectory()){
		dest = path.resolve(dest, "./" + path.basename(src));
	}

	return fs.copyFileSync(src, dest);
}
