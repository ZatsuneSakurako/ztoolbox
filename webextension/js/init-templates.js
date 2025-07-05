import {getSessionNativeIsConnected} from "./classes/chrome-native-settings.js";

/**
 *
 * @return {Promise<nunjucks.Environment>}
 */
export async function getNunjucks() {
	if (!self.nunjucks) {
		await import('../lib/nunjucks-slim.js');
		await import(`../templates/templates.js`);

		const nunjucks = await self.nunjucks,
			nunjucksEnv = self.nunjucksEnv = new nunjucks.Environment({
				//
			});
		nunjucksEnv.addFilter('type', function(variable) {
			return typeof variable;
		});
		nunjucksEnv.addFilter('wait', function(variable, callback) {
			if (variable instanceof Promise) {
				variable.then(result => {
					callback(null, result);
				}).catch(callback);
				return;
			}
			callback(variable);
		}, true);
	}
	return self.nunjucksEnv;
}

/**
 *
 * @param {string} templateName
 * @param {object} context
 * @param {boolean} [async]
 * @return {any}
 */
export async function nunjuckRender(templateName, context, async=false) {
	const isConnected = await getSessionNativeIsConnected();
	if (isConnected) {
		const result = await chrome.runtime.sendMessage(chrome.runtime.id, {
			id: 'nunjuckRender',
			data: [
				{ templateName, context, async },
			]
		});
		if (result.isError) throw new Error(result.data ?? 'NUNJUCK_RENDER_ERROR')
		return result.response;
	}



	const nunjucks = await getNunjucks();
	if (!async) return nunjucks.render(templateName + '.njk', context);

	const promiseWithResolver = Promise.withResolvers();
	nunjucks.render(templateName + '.njk', context, function (err, result) {
		console.dir(arguments)
		if (err) {
			promiseWithResolver.reject(err);
			return;
		}
		promiseWithResolver.resolve(result);
	});
	return promiseWithResolver.promise;
}
