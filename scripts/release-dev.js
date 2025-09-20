import * as fs from "node:fs";
import * as path from "node:path";
import webExt from "web-ext";
import {exec as _exec} from "child_process";
import "dotenv/config";
import {error, info, success, warning} from "./common/custom-console.js";
import {projectRootDir as pwd} from "./projectRootDir.js";

const pJson = JSON.parse(fs.readFileSync(pwd + '/package.json', {encoding: 'utf-8'})),
	echo = console.log
;



/**
 *
 * @param {string} cmd
 * @return {Promise<string>}
 */
function exec(cmd) {
	return new Promise((resolve, reject)=>{
		// noinspection JSUnusedLocalSymbols
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
	const fileTarget = `./z-toolbox_dev-${pJson.version}.zip`,
		fileTargetFirefox = `./z-toolbox_dev-firefox-${pJson.version}.zip`;
	if (fs.existsSync(path.normalize(`${pwd}/${fileTarget}`))) {
		throwException(`Zip package already exist for version ${pJson.version}!`);
	}
	if (fs.existsSync(path.normalize(`${pwd}/${fileTargetFirefox}`))) {
		throwException(`Zip package already exist for Firefox version ${pJson.version}!`);
	}



	/**
	 *
	 * @type { { skipDefaultZip: boolean, readonly manifestOverrides?: function(manifestJson: object, pJson:Readonly<object>): object, readonly publishRelease?: function(firefoxReleaseFilePath:string, manifestJson:object): Promise<void> } }
	 */
	let localRelease = undefined;
	if (fs.existsSync(`${import.meta.dirname}/release-dev.loc.js`)) {
		localRelease = await import("./release-dev.loc.js");
	}



	const webExtManifestJsonPath = path.normalize(`${pwd}/webextension/manifest.json`);
	let manifestJson = JSON.parse(fs.readFileSync(webExtManifestJsonPath, 'utf8'));

	manifestJson.version = pJson.version;
	fs.writeFileSync(webExtManifestJsonPath, JSON.stringify(manifestJson, null, '\t'), 'utf8');


	const tmpPath = path.normalize(`${pwd}/tmp`);
	if (fs.existsSync(tmpPath)) {
		warning("Temporary folder already exist, deleting...");
		fs.rmSync(tmpPath, { recursive: true });
	}
	fs.mkdirSync(tmpPath);

	echo("Copying into tmp folder");
	await errorHandler(exec("cd " + pwd + " && cp -rt tmp ./webextension/_locales ./webextension/assets ./webextension/js ./webextension/lib ./webextension/templates ./webextension/*.html ./webextension/icon*.png ./webextension/LICENSE ./webextension/manifest.json"));



	const ignoredFiles = [];
	try {
		const packageJson = (await import('../package.json', {
			with: {
				type: 'json',
			}
		})).default;
		if (Array.isArray(packageJson.webExt.ignoreFiles)) {
			ignoredFiles.push(...packageJson.webExt.ignoreFiles);
		}
	} catch (e) {
		console.error(e);
	}



	if (localRelease && localRelease.skipDefaultZip === true) {
		warning("Skipping default zip creation");
	} else {
		await errorHandler(webExt.cmd.build({
			sourceDir: path.resolve(pwd, './tmp'),
			artifactsDir: '.',
			ignoreFiles: ignoredFiles,
			filename: `z-toolbox_dev-${pJson.version}.zip`,
			overwriteDest: true
		}, {
			shouldExitProgram: false,
		}));
	}



	echo('Firefox manifest v3 overrides...');
	delete manifestJson['key'];
	manifestJson.background = {
		"page": "/index.html",
	};

	const manifestPermissions = new Set(manifestJson.permissions ?? []),
		optionalPermissions = new Set(manifestJson.optional_permissions ?? [])
	;
	if (manifestPermissions.has('userScripts')) {
		manifestPermissions.delete('userScripts');
		optionalPermissions.add('userScripts');
	}
	manifestJson.permissions = Array.from(manifestPermissions);
	manifestJson.optional_permissions = Array.from(optionalPermissions);

	/**
	 *
	 * @see https://discourse.mozilla.org/t/how-to-prevent-upgrading-insecure-request-to-use-wss/126797/4
	 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#upgrade_insecure_network_requests_in_manifest_v3
	 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_security_policy#manifest_v3_syntax
	 * @type {{extension_pages: string}}
	 */
	manifestJson["content_security_policy"] = {
		"extension_pages": "default-src 'self' data: http://* https://* moz-extension://* chrome://* ws://localhost:42080 http://localhost:42080; script-src 'self'; style-src 'self' chrome://* moz-extension://* 'unsafe-inline';"
	};

	if (localRelease && typeof localRelease.manifestOverrides === 'function') {
		info('Local release manifest overrides...');
		manifestJson = await localRelease.manifestOverrides(manifestJson, pJson) ?? manifestJson;
	}
	if (!manifestJson.browser_specific_settings) {
		manifestJson.browser_specific_settings = {
			"browser_specific_settings": {
				"gecko": {
					"id": "ztoolbox_dev@zatsunenomokou.eu",
					"update_url": "https://github.com/ZatsuneNoMokou/ztoolbox/raw/master/dist/z_toolbox_dev.update.json",
					"strict_min_version": pJson.engines.firefox,
				},
				"gecko_android": {}
			},
		};
	}

	fs.writeFileSync(path.normalize(`${pwd}/tmp/manifest.json`), JSON.stringify(manifestJson, null, '\t'), {
		encoding: 'utf8',
	});

	const firefoxReleaseFilePath = `z-toolbox_dev-firefox-${pJson.version}.zip`;
	await errorHandler(webExt.cmd.build({
		sourceDir: path.resolve(pwd, './tmp'),
		artifactsDir: '.',
		ignoreFiles: ignoredFiles,
		filename: firefoxReleaseFilePath,
		overwriteDest: true
	}, {
		shouldExitProgram: false,
	}));



	if (localRelease && typeof localRelease.publishRelease === 'function') {
		info('Local release...');
		await localRelease.publishRelease(path.normalize(`${pwd}/${firefoxReleaseFilePath}`), manifestJson);
	} else if (!!process.env.FIREFOX_API_KEY && !!process.env.FIREFOX_API_SECRET) {
		info('Firefox signing...');
		/**
		 *
		 * @type { {success: boolean, id: string, downloadedFiles: string[]} }
		 */
		const firefoxSignResult = await errorHandler(webExt.cmd.sign({
			sourceDir: path.resolve(pwd, './tmp'),
			artifactsDir: '.',
			ignoreFiles: ignoredFiles,
			amoBaseUrl: process.env.AMO_BASE_URL,
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
			fs.writeFileSync(path.normalize(`${pwd}/dist/z_toolbox_dev.update.json`), {
				"addons": {
					"ztoolbox_dev@zatsunenomokou.eu": {
						"updates": [
							{ "version": manifestJson.version,
								"update_link": "https://github.com/ZatsuneNoMokou/ztoolbox/raw/master/dist/z_toolbox_dev.xpi",
								"applications": {
									"gecko": { "strict_min_version": pJson.engines.firefox },
									"gecko_android": {}
								}
							}
						]
					}
				}
			}, {
				encoding: 'utf-8',
			});


			// Example file name : z_toolbox_dev-0.17.1-an+fx.xpi
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
			fs.renameSync(signedXpi, `${pwd}/dist/z_toolbox_dev.xpi`);
		}
	}



	fs.rmSync(tmpPath, { recursive: true });
}

await init();
