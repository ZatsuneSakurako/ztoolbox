'use strict';

let _ = browser.i18n.getMessage;

class ExtendedMap extends Map{
	addValue(id, newValue) {
		this.set(id, this.get(id) + newValue);
	}

	getBestIcon(){
		// Map must be a Map of items like ["64x64",<url>]
		let bestIconMinSize = 0;
		let bestUrl = "";
		this.forEach((value, index) => {
			let sizes = index.split("x");
			if(sizes.length === 2){
				let minSize = Math.min(sizes[0],sizes[1]);
				if(minSize > bestIconMinSize){
					bestIconMinSize = minSize;
					bestUrl = value;
				}
			}
		});
		return bestUrl;
	}
}

function doNotifyWebsite(website){
	let websiteAPI = websites.get(website),
		websiteData = websitesData.get(website),
		foldersList = ""
	;

	let notificationList = [],
		labelArray = [];

	if(websiteData.logged){
		if(websiteData.hasOwnProperty("folders")){
			websiteData.folders.forEach((folderData, name) => {
				let count = folderData.folderCount;
				if(typeof count === "number" && !isNaN(count) && count > 0){
					let suffix = "";
					if(websiteData.notificationState.count !== null && websiteData.count > websiteData.notificationState.count){
						suffix=` (+${websiteData.count - websiteData.notificationState.count})`;
					}
					labelArray.push(`${name}: ${count}${suffix}`);
					notificationList.push({"title": `${(typeof folderData.folderName === "string")? folderData.folderName : name}: `, "message": count.toString()});
				}
			});
			foldersList += labelArray.join("\n");
		}
	}

	if(!websiteData.logged){
		if(websiteData.notificationState.logged === null || websiteData.notificationState.logged === true){
			doNotif({
				"title": i18ex._("website_notif", {"website": website}),
				"message": i18ex._("website_not_logged", {"website": website}),
				"iconUrl": websiteData.websiteIcon,
				"buttons": [
					notifButtons.openUrl,
					notifButtons.close
				]
			})
				.then(()=>{
					openTabIfNotExist(websiteAPI.getLoginURL(websiteData));
				})
				.catch(console.warn)
			;
		}
		websiteData.notificationState.logged = websiteData.logged;
	} else if(typeof websiteData.count === "number" && !isNaN(websiteData.count) && (websiteData.notificationState.count === null || websiteData.count > websiteData.notificationState.count)){
		if(getPreference("notify_checkedData")){
			doNotif({
				"title": i18ex._("website_notif", {"website": website}),
				"message": i18ex._("count_new_notif", {"count": websiteData.count}) + "\n" + foldersList,
				"iconUrl": websiteData.websiteIcon,
				"buttons": [
					notifButtons.openUrl,
					notifButtons.close
				]
			})
				.then(()=>{
					openTabIfNotExist(websiteAPI.getViewURL(websiteData));
				})
				.catch(console.warn)
			;
		}

		if(getPreference("notify_vocal")){
			voiceReadMessage("fr", i18ex._("count_new_notif", {"count": websiteData.count}));
		}
	} else if(getPreference("notify_all_viewed") && (typeof websiteData.count === "number" && websiteData.count === 0) && (typeof websiteData.notificationState.count === "number" && websiteData.notificationState.count > 0)){
		doNotif({
			"title": i18ex._("website_notif", {"website": website}),
			"message": i18ex._("all_viewed"),
			"iconUrl": websiteData.websiteIcon,
			"buttons": [
				notifButtons.openUrl,
				notifButtons.close
			]
		})
			.then(()=>{
				openTabIfNotExist(websiteAPI.getViewURL(websiteData));
			})
			.catch(console.warn)
		;
	}

	websiteData.notificationState.count = websiteData.count;
}


class websiteDefaultData{
	constructor(){
		return {
			"notificationState": {
				"count": null,
				"logged": null
			},
			"count": 0,
			"folders": new ExtendedMap(),
			"websiteIcon": "",
			"logged": null,
			"loginId": ""
		};
	}
}

let isRefreshingData = false;
async function refreshWebsitesData(){
	if(isRefreshingData===true){
		console.warn("Already refreshing...");
		return false;
	}

	isRefreshingData = true;

	console.info("Refreshing websites data...");
	let promises = new Map();

	websites.forEach((websiteAPI, website) =>{
		promises.set(website, refreshWebsite(website));
		promises.get(website)
			.then(()=>{
				if(appGlobal["notificationGlobalyDisabled"]===false){
					doNotifyWebsite(website);
				}
			})
			.catch((data) => {ZDK.consoleDir(data,"refreshWebsitesData");});
	});

	const data = await PromiseWaitAll(promises);

	clearInterval(interval);
	interval = setInterval(refreshWebsitesData, getPreference('check_delay') * 60000);

	let count = null;
	let label = chrome.runtime.getManifest().name;


	websitesData.forEach((websiteData, website) => {
		if(websiteData.logged && websiteData.count !== null){
			if(count === null){
				count = 0;
			}
			count += websiteData.count;
		}
	});

	if(getPreference("showAdvanced") && getPreference("showExperimented")){
		console.group();
		console.info("Websites check end");
		ZDK.consoleDir(data, "xhrRequests:");
		ZDK.consoleDir(ZDK.mapToObj(websitesData), "Data:");
		console.groupEnd();
	}

	// chrome.browserAction.setTitle({title: (count === null)? i18ex._("no_website_logged") : label});

	let displayedCount;
	if(count === null){
		displayedCount = "";
	} else if(count>=1000000){
		displayedCount = parseInt(count / 1000000)+"M";
	} else if(count>=10000){
		displayedCount = parseInt(count / 1000)+"k";
	} else {
		displayedCount = count.toString();
	}

	chrome.browserAction.setBadgeText({text: displayedCount});
	chrome.browserAction.setBadgeBackgroundColor({color: (count !== null && count > 0)? "#FF0000" : "#424242"});

	setTimeout(function () {
		isRefreshingData = false;
	}, 5 * 1000);
	return data;
}
appGlobal["refreshWebsitesData"] = refreshWebsitesData;
async function refreshWebsite(website){
	const xhrRequest = await Request({
		url: websites.get(website).dataURL,
		overrideMimeType: "text/html; charset=utf-8",
		contentType: "document",
		Request_documentParseToJSON: websites.get(website).Request_documentParseToJSON
	}).get();

	if(/*(/^2\d*$/.test(xhrRequest.status) == true || xhrRequest.statusText == "OK") && */ xhrRequest.json !== null){
		let data = xhrRequest.map;
		let websiteData = websitesData.get(website);

		websiteData.count = data.get("count");
		websiteData.logged = data.get("logged");
		websiteData.loginId = data.get("loginId");
		websiteData.websiteIcon = data.get("websiteIcon");
		if(data.has("folders")){
			websiteData.folders = data.get("folders");
		}
		return xhrRequest;
	} else {
		console.warn(`Error retrieving page for "${website}"`);
		//let websiteData = websitesData.get(website);
		//websiteData.logged  = false;
		return xhrRequest;
	}
}


let interval,
	websites = new Map(),
	websitesData = new Map();
appGlobal["websites"] = websites;
appGlobal["websitesData"] = websitesData;
(async function(){
	await zDK.loadJS(document, ["platforms/deviantart.js"]);

	websites.forEach((websiteAPI, website) => {
		websitesData.set(website, new websiteDefaultData());
	});

	refreshWebsitesData();
})();