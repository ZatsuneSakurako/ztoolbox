import {execSync as _execSync} from "child_process";
import {projectRootDir as pwd} from "../projectRootDir.js";

/**
 *
 * @param {string} command
 * @param {boolean} outputInConsole
 * @return {Buffer | string} Stdout from the command
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
