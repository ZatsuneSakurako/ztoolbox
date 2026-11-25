/**
 *
 * @param {...string[]} prefIds
 * @return {Promise<Map<any, any>>}
 */
export async function getPreferences(...prefIds) {
	const output = new Map();
	try {
		const response = await chrome.runtime.sendMessage({
			id: 'getPreferences',
			data: {
				preferences: prefIds,
			},
		});
		if (response && typeof response === 'object' && 'preferences' in response) {
			for (const [id, value] of Object.entries(response.preferences)) {
				output.set(id, value);
			}
		} else {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(response, 'UNEXPECTED_RESPONSE');
		}
	} catch (e) {
		console.error(e);
	}
	return output;
}
