/**
 *
 * @param {string} string
 * @return {Promise<boolean>}
 */
export async function copyToClipboard(string) {
	try {
		await navigator.clipboard.writeText(string);
		return true;
	} catch (e) {
		console.error(e);
		return false;
	}
}
