appGlobal.notificationGlobalyDisabled = false;

appGlobal.sendDataToMain = (source, id, data)=>{
	console.dir([
		source,
		id,
		data
	]);

	if(source==="ZToolBox_Panel" && id==="panel_onload"){
		if(typeof panel__UpdateData==="function"){
			panel__UpdateData();
		} else {
			console.warn("panel__UpdateData not found");
		}
	}
};

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
browser.contextMenus.removeAll();
class ContextMenusController extends Map {
	constructor(){
		super();
	}

	create(title, targetUrlPatterns, onClick){
		/*if(browser.menu!==undefined && browser.menu !== null){
			// tools_menu is available with it
			console.info("browser.menu available");
		}*/
		if(browser.contextMenus!==undefined && browser.contextMenus !== null){
			let targetUrlPatterns_processed = [];
			if(Array.isArray(targetUrlPatterns)){
				targetUrlPatterns.forEach(url=>{
					if(/https?:\/\/.*/.test(url)){
						targetUrlPatterns_processed.push(url);
					} else {
						targetUrlPatterns_processed.push("http://"+url);
						targetUrlPatterns_processed.push("https://"+url);
					}
				})
			} else {
				throw "targetUrlPattern must be an array";
			}

			this.set(browser.contextMenus.create({
				"contexts": [
					"link",
					"page"
				],
				"targetUrlPatterns": targetUrlPatterns_processed,
				"enabled": true,
				"onclick": onClick,
				"title": title
			}), {
				"title": title,
				"targetUrlPatterns": targetUrlPatterns,
				"onClick": onClick,
				"targetUrlPatterns_processed": targetUrlPatterns_processed
			});
		}
	}
}

const contextMenusController = new ContextMenusController();

const EXTRACT_SEARCHPARAMS_REG = /^([^?]*)\?([^#]*)(.*)/;

contextMenusController.create(i18ex._("OpenWithoutPlaylist"), ["*.youtube.com/watch?*&list=*","*.youtube.com/watch?list=*"], function (info, tab) {
	const removePlaylistFromUrl = url=>{
		let urlObj = EXTRACT_SEARCHPARAMS_REG.exec(url);

		const searchParams = new URLSearchParams(urlObj[2]); // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
		searchParams.delete("list");
		searchParams.delete("index");

		return `${urlObj[1]}?${searchParams.toString()}${urlObj[3]}`;
	};

	if(info.hasOwnProperty("linkUrl")){
		browser.tabs.create({ "url": removePlaylistFromUrl(info.linkUrl) })
			.catch(err=>{
				if(err){
					console.error(err);
				}
			})
		;
	} else {
		browser.tabs.update(tab.id, {
			"url": removePlaylistFromUrl(tab.url)
		})
			.catch(err=>{
				if(err){
					console.error(err);
				}
			})
		;
	}
});

function urlParamToJson(url){
	const extractSearchParam = /^[^?]*\?([^#]*)/.exec(url);
	if(extractSearchParam!==null){
		const searchParams = new URLSearchParams(extractSearchParam[1]);
		let result = {};
		for (let p of searchParams){
			result[p[0]] = p[1];
		}
		return result;
	}
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if(sender.hasOwnProperty("url")){
		console.info(`Receiving message from: ${sender.url} (${sender.id})`);
	}
	if(typeof message === "object" && message.hasOwnProperty("data")){
		if(message.data.id==="getPreferences"){
			let reply = {};
			message.data.preferences.forEach(prefId=>{
				reply[prefId] = getPreference(prefId);
			});
			sendResponse({
				"preferences": reply
			})
		}
	}
});

function openTabIfNotExist(url){
	//console.log(url);
	chrome.tabs.query({}, function(tabs) {
		let custom_url = url.toLowerCase().replace(/http(?:s)?\:\/\/(?:www\.)?/i,"");
		for(let tab of tabs){
			if(tab.url.toLowerCase().indexOf(custom_url) !== -1){ // Mean the url was already opened in a tab
				chrome.tabs.highlight({tabs: tab.index}); // Show the already opened tab
				chrome.tabs.reload(tab.id); // Reload the already opened tab
				return true; // Return true to stop the function as the tab is already opened
			}
		}
		// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
		chrome.tabs.create({ "url": url });
		return false; // Return false because the url wasn't already in a tab
	});
}

const chromeNotifications = new ChromeNotificationControler(),
	notifButtons = {
		"openUrl": {title: i18ex._("Open_in_browser"), iconUrl: "/data/images/ic_open_in_browser_black_24px.svg"},
		"close": {title: i18ex._("Close"), iconUrl: "/data/images/ic_close_black_24px.svg"},
		"addItem": {title: i18ex._("Add"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"deleteItem": {title: i18ex._("Delete"), iconUrl: "/data/images/ic_delete_black_24px.svg"},
		"cancel": {title: i18ex._("Cancel"), iconUrl: "/data/images/ic_cancel_black_24px.svg"},
		"yes": {title: i18ex._("Yes"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"no": {title: i18ex._("No"), iconUrl: "/data/images/ic_cancel_black_24px.svg"}
	}
;
function doNotif(options, suffixConfirmIfNoButtons=false){
	return new Promise((resolve, reject)=>{
		if(typeof options !== "object" || options === null){
			reject("Missing argument");
			return null;
		}
		if(!options.title || typeof options.title !== "string" || options.title === ""){
			options.title = "Live notifier";
		}
		if(!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === ""){
			options.iconUrl = myIconURL;
		}

		if(suffixConfirmIfNoButtons === true){
			options.title = `${options.title} (${i18ex._("click_to_confirm")})`;
		} else if(chromeNotifications.chromeAPI_button_availability === true && (!options.buttons || !Array.isArray(options.buttons))){ // 2 buttons max per notification, the 2nd button is used as a cancel (no action) button in Live Notifier
			options.buttons = [notifButtons.close];
		}

		chromeNotifications.send(options)
			.then(result=>{
				const {triggeredType, notificationId, buttonIndex} = result;
				console.info(`${notificationId}: ${triggeredType}${(buttonIndex && buttonIndex !==null)? ` (Button index: ${buttonIndex})`:""}`);

				// 0 is the first button, used as button of action
				if((buttonIndex===null || buttonIndex===0)){
					resolve(result);
				} else {
					reject(result);
				}
			})
			.catch(err=>{
				/*if(err){
					console.warn(err);
				}*/
				reject(err);
			})
		;
	});
}
appGlobal["doNotif"] = doNotif;





let browserWindows = appGlobal["windows"] = [],
	windowSwitchContextMenu_contexts = [],
	windowSwitchContextMenu_subMenu = new Map()
;

if(browser.contextMenus.ContextType.hasOwnProperty("PAGE")){
	windowSwitchContextMenu_contexts.push(browser.contextMenus.ContextType.PAGE)
}
if(browser.contextMenus.ContextType.hasOwnProperty("TAB")){
	windowSwitchContextMenu_contexts.push(browser.contextMenus.ContextType.TAB)
}

async function getCurrentWindowIds() {
	browserWindows = await browser.windows.getAll({
		populate: false,
		windowTypes: ["normal"]
	});

	await browser.contextMenus.update(windowSwitchContextMenu, {
		"enabled": browserWindows.length > 1,
		"title": browserWindows.length > 1? i18ex._("move_tab_of_window") : i18ex._("no_other_window")
	});

	windowSwitchContextMenu_subMenu.forEach(async function(subMenuId, windowId){
		await browser.contextMenus.remove(subMenuId);
		windowSwitchContextMenu_subMenu.delete(windowId);
	});
	if(browserWindows.length>2){
		browserWindows.forEach(async browserWindow=>{
			const [activeTab] = await browser.tabs.query({
				"active": true,
				"windowId": browserWindow.id,
				"windowType": "normal"
			});

			windowSwitchContextMenu_subMenu.set(
				browserWindow.id,
				browser.contextMenus.create({
					"contexts": windowSwitchContextMenu_contexts,
					"enabled": true,
					"onclick": windowSwitchContextMenu_onClick,
					"parentId": windowSwitchContextMenu,
					"title": i18ex._("window_windowId", {
						"windowId": browserWindow.id,
						"window": stringEllipse(activeTab.title, 25)
					})
				})
			);
		});
	}
	windowSwitchContextMenu_update();
	return browserWindows;
}

async function windowSwitchContextMenu_onClick(info, tab) {
	let action_windowId=null;

	if(windowSwitchContextMenu_subMenu.size>0){
		let browserWindowTarget = null;
		windowSwitchContextMenu_subMenu.forEach((subMenuId, browserWindowId)=>{
			if(browserWindowTarget===null){
				if(subMenuId===info.menuItemId){
					browserWindowTarget = browserWindowId;
				}
			}
		});

		if(browserWindowTarget!==null){
			action_windowId = browserWindowTarget;
		}
	} else {
		action_windowId = (browserWindows[0].id!==tab.windowId)? browserWindows[0].id : browserWindows[1].id;
	}

	if(action_windowId===null){
		throw "Cound not get Window";
	}

	await browser.tabs.move(tab.id, {
		"windowId": action_windowId,
		"index": -1
	});

	await browser.tabs.update(tab.id, {
		"active": true
	});
}

async function windowSwitchContextMenu_update() {
	if(browserWindows.length>2){
		currentBrowserWindow = await browser.windows.getCurrent({
			populate: false,
			windowTypes: ["normal"]
		});

		windowSwitchContextMenu_subMenu.forEach(async (subMenuId, browserWindowId)=>{
			const [activeTab] = await browser.tabs.query({
				"active": true,
				"windowId": browserWindowId,
				"windowType": "normal"
			});

			await browser.contextMenus.update(subMenuId, {
				"enabled": currentBrowserWindow.id!==browserWindowId,
				"title": i18ex._("window_windowId", {
					"windowId": browserWindowId,
					"window": stringEllipse(activeTab.title, 25)
				})
			});
		});
	}
}

let windowSwitchContextMenu;
(function () {
	let contextMenuParams = {
		"contexts": windowSwitchContextMenu_contexts,
		"enabled": false,
		"icons": {
			"16": "/data/images/ic_open_in_browser_black_24px.svg"
		},
		"onclick": windowSwitchContextMenu_onClick,
		"title": i18ex._("no_other_window")
	};
	try{
		windowSwitchContextMenu = browser.contextMenus.create(contextMenuParams);
	} catch(err){
		if(err.toString().indexOf('icons')===-1){
			console.warn(err);
		}

		delete contextMenuParams.icons;
		windowSwitchContextMenu = browser.contextMenus.create(contextMenuParams);
	}
})();

getCurrentWindowIds();
browser.windows.onCreated.addListener(getCurrentWindowIds);
browser.windows.onRemoved.addListener(getCurrentWindowIds);
browser.windows.onFocusChanged.addListener(windowSwitchContextMenu_update);
browser.tabs.onUpdated.addListener(function (info, changeInfo, tab) {
	if(tab.active===true && ((changeInfo.hasOwnProperty("status") && changeInfo.status === "complete") || changeInfo.hasOwnProperty("title"))){
		// Only update context menu if the active tab have a "complete" load
		windowSwitchContextMenu_update.call(this, tab.windowId);
	}
});






appGlobal["version"] = browser.runtime.getManifest().version;