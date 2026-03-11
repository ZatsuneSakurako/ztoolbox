import stylelint from "stylelint";
import {error, info, success, warning} from "./common/custom-console.js";
import {execSync} from "./common/custom-child-process.js";
import { projectRootDir as pwd } from "./projectRootDir.js";

const WARNING_CHAR="⚠",
	SUCCESS_CHAR="✅"
;


(async function () {
	info(`Current dir: ${pwd}\n`);

	warning(`${WARNING_CHAR} Test only cover linting with CSS (with Stylelint), and web-ext for now ${WARNING_CHAR}\n`);

	info(`Testing CSS...`);

	let result = null,
		result_error = null
	;

	try{
		result = await stylelint.lint({
			"configBasedir": pwd,
			"defaultSeverity": "warning",
			"files": "webextension/**/*.css",
			"formatter": "verbose"
		})
			.catch(error)
		;
	} catch (err){
		result_error = err;
	}

	if(result_error){
		error("Error thrown :");
		error(result_error);
		process.exit(1);
		return;
	} else if(result.errored){
		error(result.output);
		process.exit(1);
		return;
	}

	result = null;
	result_error = null;


	info(`Testing web-ext lint...`);

	try {
		result = execSync("web-ext lint --self-hosted --source-dir ./webextension", true);
	} catch (err) {
		result_error = err;
	}

	if(result_error){
		error("Error thrown :");
		error(result_error);
		process.exit(1);
		return;
	}

	result = null;
	result_error = null;

	success(`\n${SUCCESS_CHAR} No errors`);
	process.exit(0);
})();
