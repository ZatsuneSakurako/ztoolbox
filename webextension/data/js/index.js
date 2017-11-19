appGlobal.notificationGlobalyDisabled = false;

appGlobal.sendDataToMain = (source, id, data)=>{
	console.dir([
		source,
		id,
		data
	])
};

/*
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/create
 */
class ContextMenusController extends Map {
	constructor(){
		super();
		browser.contextMenus.removeAll();
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
