chrome.runtime.sendMessage({
	"data": {
		"id": "getPreferences",
		"preferences": [
			"launchpadAddLink"
		]
	},
}, function(data){
	if(data.preferences.hasOwnProperty("launchpadAddLink") && data.preferences.launchpadAddLink===true){
		const reg = /launchpad\.net\/([^\/]+)\/([^\/]+)\/([^\/]+)\//,
			[originalStr, author, ppaId, os] = reg.exec(location.href),
			linkHref = `http://launchpad.net/~${author}/+archive/${os}/${ppaId}/`
		;

		function newLink(href, text){
			const newLink = document.createElement('a');
			newLink.href = href;
			newLink.textContent = (text!==undefined)? text : href;
			newLink.style.display = "block";
			newLink.style.marginRight = "0.6em";
			return newLink;
		}

		document.body.appendChild(newLink(linkHref,`ppa:${author}/${ppaId}`));
	}
});
