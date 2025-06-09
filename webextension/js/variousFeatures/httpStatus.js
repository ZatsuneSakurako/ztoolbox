export async function updateBadge(tabId, data) {
	let color = '#3B3B3B';
	if (data?.statusCode >= 500) {
		color = '#BA0000';
	} else if (data?.statusCode >= 400) {
		color = '#DE5500';
	} else if (data?.statusCode >= 300) {
		color = '#0062A3';
	} else if (data?.statusCode >= 200) {
		color = '#078F00';
	}

	// console.log(tabId, color, data.statusCode?.toString() ?? '');
	chrome.action.setBadgeText({
		tabId,
		text: data.statusCode?.toString() ?? '',
	})
		.catch(console.error)
	;
	chrome.action.setBadgeBackgroundColor({
		tabId,
		color
	})
		.catch(console.error)
	;
	chrome.action.setBadgeTextColor({
		tabId,
		color: '#ebebeb'
	})
		.catch(console.error)
	;
}
