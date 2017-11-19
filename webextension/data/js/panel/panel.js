const appGlobal = backgroundPage.appGlobal;

let sendDataToMain = function (id, data) {
	appGlobal.sendDataToMain("ZToolBox_Panel", id, data);
};

const delegate = (function () {
	const Delegate = domDelegate.Delegate;
	return new Delegate(document.body);
})();
const liveEvent = function (type, selector, handler) {
	delegate.on(type, selector, handler);
};
const appendTo = function (sel, html, doc=document) {
	return backgroundPage.zDK.appendTo(sel, html, doc);
};
const insertBefore = function (sel, html, doc=document) {
	return backgroundPage.zDK.insertBefore(sel, html, doc);
};


liveEvent("click", "#disableNotifications", ()=>{
	let disableNotificationsButton = document.querySelector("#disableNotifications");
	appGlobal["notificationGlobalyDisabled"] = !appGlobal["notificationGlobalyDisabled"];
	disableNotificationsButton.classList.toggle("off", backgroundPage.appGlobal["notificationGlobalyDisabled"]);

	disableNotificationsButton.dataset.originalTitle = disableNotificationsButton.dataset.tooltipText = i18ex._((backgroundPage.appGlobal["notificationGlobalyDisabled"])? "GloballyDisabledNotifications" : "GloballyDisableNotifications");

	if(typeof window.tooltip==="object"){
		window.tooltip.refresh();
	}
});

liveEvent("click", "#settings", function(){
	browser.runtime.openOptionsPage();
});

function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));

	if(typeof panelColorStylesheet === "object" && panelColorStylesheet !== null){
		console.info("Theme update");

		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.remove();

		document.querySelector("body").dataset.theme = panelColorStylesheet.dataset.theme;

		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

backgroundPage.panel__UpdateData = (data)=>{
	updatePanelData(data);
};

let psList = new Map();
function load_scrollbar(id){
	let scroll_node = document.querySelector(`#${id}`);

	if(scroll_node === null) {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}

	psList.set(id, new PerfectScrollbar(scroll_node, {
		// theme: "slimScrollbar",
		suppressScrollX: true
	}));
}

function scrollbar_update(nodeId){
	if(typeof nodeId === "string" && nodeId !== ""){
		let scrollbar_node = document.querySelector(`#${nodeId}`);
		if(scrollbar_node !== null && psList.has(nodeId)){
			psList.get(nodeId).update();
		}
	}
}

function current_version(version){
	let current_version_node = document.querySelector("#current_version");
	//current_version_node.textContent = version;
	current_version_node.dataset.currentVersion = version;
}
current_version(appGlobal["version"]);


loadTranslations();

sendDataToMain("panel_onload");

load_scrollbar("panelContent");

window.onresize = _.debounce(()=>{
	scrollbar_update("panelContent");
}, 100, {
	maxWait: 200
})
;