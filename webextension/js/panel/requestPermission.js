const btnSelector = '#requestPermissionItem';

async function hasFetchPermission(...hostList) {
	try {
		return await chrome.permissions.contains({
			origins: hostList.length ? hostList : ['<all_urls>'],
			permissions: [
				'webRequest'
			]
		});
	} catch (e) {
		console.error(e);
		return false;
	}
}

async function hasUserScriptPermission() {
	try {
		return await chrome.permissions.contains({
			permissions: [ 'userScripts' ]
		});
	} catch (e) {
		console.error(e);
		return false;
	}
}

async function updateBtnState() {
	const permission = (await hasFetchPermission()) && (await hasUserScriptPermission());
	const $btn = document.querySelector(btnSelector);
	$btn.classList.toggle('hide', !!permission);
}
updateBtnState()
	.catch(console.error)
;
