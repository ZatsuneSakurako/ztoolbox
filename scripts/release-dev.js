const
	pjson = require('../package.json'),
	fs = require("fs-extra"),
	path = require("path"),
	pwd = path.join(__dirname, ".."),

	{ exec:_exec } = require('child_process'),

	{fsReadFile} = require("./common/file-operations"),
	echo = console.log,
	{error, warning, info, success} = require("./common/custom-console")
;


/**
 *
 * @param {String} cmd
 * @return {Promise<String>}
 */
function exec(cmd) {
	return new Promise((resolve, reject)=>{
		_exec(cmd, (err, stdout, stderr) => {
			if(err) {
				reject(err);
			} else {
				resolve(stdout);
			}
		});
	})
}

/**
 *
 * @param {String} msg
 */
function throwException(msg) {
	console.trace();
	error(msg);
	process.exit(1);
}

/**
 *
 * @param {Promise} promise
 * @return {Promise<*>}
 */
function errorHandler(promise) {
	promise.catch(err=>{
		throwException(err);
	});
	return promise;
}


async function init() {
	if(await fs.pathExists(path.join(pwd, `./z-toolbox_dev_-${pjson.version}.zip`))){
		throwException(`Zip package already exist for version ${pjson.version}!`);
	}

	const webExtManifestJsonPath = path.join(pwd, "./webextension/manifest.json"),
		data = await fsReadFile(webExtManifestJsonPath),

		versionReg = /([ \t]"version": *")(\d+\.\d+\.\d+)(",?)/gi
	;

	let replacedCount = 0;
	data.replace(versionReg, (match, p1, p2, p3)=>{
		replacedCount++;
		return p1 + pjson.version + p3;
	});
	if(replacedCount!==1){
		throwException("Error updating version");
	}

	errorHandler(fs.writeFile(webExtManifestJsonPath, data, {
		encoding: 'utf-8'
	}));


	const tmpPath = path.join(pwd, "./tmp");
	if(await fs.pathExists(tmpPath)){
		warning("Temporary folder already exist, deleting...");
		await errorHandler(fs.remove(tmpPath));
	}
	await errorHandler(fs.mkdir(tmpPath));

	echo("Copying into tmp folder");
	await errorHandler(exec("cd " + pwd + " && cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/init.js ./webextension/LICENSE ./webextension/manifest.json"));

	const ignoredFiles = [];

	try {
		const packageJson = fs.readJSONSync(path.resolve(process.cwd(), './package.json'));
		if (Array.isArray(packageJson.webExt.ignoreFiles)) {
			ignoredFiles.push(...packageJson.webExt.ignoreFiles);
		}
	} catch (e) {
		console.error(e);
	}

	let ignoredFilesArgument = '';
	if (ignoredFiles.length > 0) {
		info('Ignored files : \n' + ignoredFiles.join('\n'));
		ignoredFilesArgument = ` --ignore-files ${(ignoredFiles.join(' '))}`;
	}

	await errorHandler(exec(`cd ${pwd} && web-ext build --artifacts-dir ./ --source-dir ./tmp ${ignoredFilesArgument}`));

	await errorHandler(fs.remove(tmpPath));
}

init();
