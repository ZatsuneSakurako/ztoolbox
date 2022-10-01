/**
 *
 * @param {...string} [hostList]
 * @returns {Promise<boolean>}
 */
export async function hasFetchPermission(...hostList) {
	try {
		return await browser.permissions.contains({
			origins: hostList.length ? hostList : ['<all_urls>'],
			permissions: [
				'webRequest'
			]
		})
	} catch (e) {
		console.error(e);
		return false
	}
}
