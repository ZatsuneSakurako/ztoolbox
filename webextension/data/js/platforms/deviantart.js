let deviantArt = {
	dataURL:"http://www.deviantart.com/notifications/",
	getViewURL:
		function(websiteState){
			if(websiteState.count > 0){
				return "http://www.deviantart.com/notifications/";
			} else if(websiteState.logged !== null && websiteState.logged && websiteState.loginId !== ""){
				return `http://www.deviantart.com/${websiteState.loginId}`;
			} else if(websiteState.logged !== null && websiteState.logged === false){
				return "http://www.deviantart.com/notifications/"; // dA will redirect it to https://www.deviantart.com/users/login?ref=*
			} else {
				return "http://www.deviantart.com/";
			}
		},
	getLoginURL:
		function(websiteState){
			return "http://www.deviantart.com/notifications/"; // dA will redirect it to https://www.deviantart.com/users/login?ref=*
		},
	/**
	 *
	 * @param {XMLHttpRequest} xhrRequest
	 * @return {Object | null}
	 */
	Request_documentParseToJSON:
		function(xhrRequest){
			let dataDocument = xhrRequest.response;

			if(typeof dataDocument !== "object" || dataDocument===null){
				return null;
			}

			let result = null;

			let nodes = dataDocument.querySelectorAll(".oh-menuctrl .oh-menu.iconset-messages a.mi");
			if(nodes !== null){
				result = new ExtendedMap();

				result.set("count", 0);
				result.set("logged", false);
				result.set("loginId", "");
				result.set("folders", new Map());
				
				let dA_userId_node = dataDocument.querySelector("#oh-menu-deviant .username");
				if(dA_userId_node !== null){
					result.set("logged", true);
					result.set("loginId", dA_userId_node.textContent);
				}
				
				let iconNodes = dataDocument.querySelectorAll("link[sizes][rel*=icon][href]");
				let icons = new ExtendedMap();
				for(let iconNode of iconNodes){
					if(iconNode.getAttribute("sizes") !== null){
						icons.set(iconNode.getAttribute("sizes"), iconNode.href);
					}
				}
				let iconUrl = icons.getBestIcon();
				result.set("websiteIcon", iconUrl);

				for(let node of nodes){
					if(typeof node.tagName === "string" && node.hasChildNodes() && node.children.length > 0){ // children exclude text and comment nodes
						let idNode = node.querySelector(".oh-darker");
						if(idNode === null || node.outerHTML.indexOf("All notifications") !== -1){continue}
						let folderName = idNode.textContent;
						
						let countReg = /<span[^<]*>\s*(\d+)\s*<\/span>/;
						let folderCount = 0;
						if(countReg.test(node.outerHTML) === true){
							folderCount = parseInt(countReg.exec(node.outerHTML)[1]);
							result.addValue("count", folderCount);
							//console.log(`${folderId} (${folderName}): ${folderCount}`);
							if(typeof folderCount && !isNaN(folderCount)){
								result.get("folders").set(folderName, {"folderCount": folderCount, "folderName": folderName, "folderUrl": (typeof node.href === "string")? node.href : ""});
							}
						}
					}
				}
			}
			return result;
		}
};
websites.set("deviantArt", deviantArt);
