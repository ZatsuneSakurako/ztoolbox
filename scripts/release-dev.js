import fs from "fs-extra";
import path from "path";
import webExt from "web-ext";
import chromeWebStoreUpload from "chrome-webstore-upload";
import {exec as _exec} from "child_process";
import klawSync from "klaw-sync";
import dotenv from "dotenv";
import _yargs from "yargs";
import {fsReadFile} from "./common/file-operations.js";
import {error, info, success, warning} from "./common/custom-console.js";
import {projectRootDir as pwd} from "./projectRootDir.js";

const pjson = JSON.parse(fs.readFileSync(pwd + '/package.json', {encoding: 'utf-8'})),
	echo = console.log,

	yargs = _yargs(process.argv.slice(2))
		.usage('Usage: $0 [options]')

		.option('p', {
			"alias": ['prod','production'],
			"description": 'Do stable release',
			"type": "boolean"
		})
		.fail(function (msg, err, yargs) {
			if (msg==="yargs error") {
				console.error(yargs.help());
			}

			/*if(err){// preserve stack
				throw err;
			}*/

			process.exit(1)
		})

		.help('h')
		.alias('h', 'help')
		.argv
;
dotenv.config();



/**
 *
 * @param {string} cmd
 * @return {Promise<string>}
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
 * @param {string} msg
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
	promise.catch(throwException);
	return promise;
}


async function init() {
	const fileTarget = `./z-toolbox_dev_-${pjson.version}.zip`;
	if(await fs.pathExists(path.join(pwd, fileTarget))){
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
	await errorHandler(exec("cd " + pwd + " && cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/LICENSE ./webextension/manifest.json"));



	echo('Handling **/*.prod.* and **/*.dev.* files...');

	const devFilePathRegex = /\.dev(\..+)$/,
		prodFilePathRegex = /\.prod(\..+)$/
	;

	const devFiles = klawSync(tmpPath, {
		nodir: true,
		filter: item => {
			return item.stats.isDirectory() || devFilePathRegex.test(item.path)
		}
	});
	const prodFiles = klawSync(tmpPath, {
		nodir: true,
		filter: item => {
			return item.stats.isDirectory() || prodFilePathRegex.test(item.path)
		}
	});

	const devPromises = devFiles.map(fileObj => {
		if (yargs.prod === true) {
			return fs.remove(fileObj.path);
		} else {
			return fs.move(fileObj.path, fileObj.path.replace(devFilePathRegex, '$1'), {
				overwrite: true
			});
		}
	});
	await Promise.all(devPromises);

	const prodPromises = prodFiles.map(fileObj => {
		if (yargs.prod === false) {
			return fs.remove(fileObj.path);
		} else {
			return fs.move(fileObj.path, fileObj.path.replace(prodFilePathRegex, '$1'), {
				overwrite: true
			});
		}
	});

	await Promise.all(prodPromises);



	const ignoredFiles = [];

	try {
		const packageJson = fs.readJSONSync(path.resolve(process.cwd(), './package.json'));
		if (Array.isArray(packageJson.webExt.ignoreFiles)) {
			ignoredFiles.push(...packageJson.webExt.ignoreFiles);
		}
	} catch (e) {
		console.error(e);
	}

	/*let ignoredFilesArgument = '';
	if (ignoredFiles.length > 0) {
		info('Ignored files : \n' + ignoredFiles.join('\n'));
		ignoredFilesArgument = ` --ignore-files ${(ignoredFiles.join(' '))}`;
	}*/

	await errorHandler(webExt.cmd.build({
		sourceDir: path.resolve(pwd, './tmp'),
		artifactsDir: '.',
		ignoreFiles: ignoredFiles
	}, {
		shouldExitProgram: false,
	}));

	if (!!process.env.CHROME_EXTENSION_ID && !!process.env.CHROME_CLIENT_ID && !!process.env.CHROME_CLIENT_SECRET && !!process.env.CHROME_REFRESH_TOKEN) {
		const webStore = chromeWebStoreUpload({
			extensionId: process.env.CHROME_EXTENSION_ID,
			clientId: process.env.CHROME_CLIENT_ID,
			clientSecret: process.env.CHROME_CLIENT_SECRET,
			refreshToken: process.env.CHROME_REFRESH_TOKEN
		});

		/*
		 * Response is a Resource Representation
		 * https://developer.chrome.com/webstore/webstore_api/items#resource
		 */
		const response = await errorHandler(webStore.uploadExisting(fileTarget/*, token*/));
		await errorHandler(await webStore.publish('trustedTesters'/*, token*/))
	}

	if (!!process.env.FIREFOX_API_KEY && !!process.env.FIREFOX_API_SECRET) {
		info('Firefox signing...');
		/**
		 *
		 * @type { {success: boolean, id: string, downloadedFiles: string[]} }
		 */
		const firefoxSignResult = await errorHandler(webExt.cmd.sign({
			sourceDir: path.resolve(pwd, './tmp'),
			artifactsDir: '.',
			ignoreFiles: ignoredFiles,
			apiKey: process.env.FIREFOX_API_KEY,
			apiSecret: process.env.FIREFOX_API_SECRET,
			channel: 'unlisted',
			timeout: 10 * 60000 // 10min
		}, {
			shouldExitProgram: false,
		}));

		/**
		 *
		 * @type {string|null}
		 */
		let signedXpi = null;
		if (!!firefoxSignResult && typeof firefoxSignResult === 'object') {
			success('Firefox signing done !');
			if (Array.isArray(firefoxSignResult.downloadedFiles) && firefoxSignResult.downloadedFiles.length === 1) {
				signedXpi = firefoxSignResult[0] ?? null;
			}
		}

		if (!signedXpi) {
			// Exemple file name : z_toolbox_dev-0.17.1-an+fx.xpi
			const xpiFiles = fs.readdirSync(pwd, {
					encoding: "utf8",
					withFileTypes: true
				})
					.filter(file => /^z[_-]toolbox[_-]dev-.*?\.xpi$/.test(file.name))
					.map(file => path.normalize(file.name))
			;
			if (xpiFiles.length === 1) {
				signedXpi = xpiFiles[0];
			}
		}

		if (!signedXpi || !fs.existsSync(signedXpi)) {
			error('Firefox signing : Could not find the signed file');
		} else {
			fs.moveSync(signedXpi, pwd + '/dist/z_toolbox_dev.xpi', {
				overwrite: true
			});
		}
	}

	await errorHandler(fs.remove(tmpPath));
}

init();
