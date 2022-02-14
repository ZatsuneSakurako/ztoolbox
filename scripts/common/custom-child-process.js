import {execSync as _execSync} from "child_process";
import {projectRootDir as pwd} from "../projectRootDir.js";

/**
 *
 * @param {String} command
 * @param {Boolean} outputInConsole
 * @return {Buffer | String} Stdout from the command
 */
export function execSync(command, outputInConsole=false) {
	let options = {
		"cwd": pwd,
		"timeout": 20 * 1000 // 10s
	};

	if(outputInConsole===true){
		options.stdio = [process.stdin, process.stdout, process.stderr];
	}

	return _execSync(command, options);
}
