chrome.runtime.sendMessage({
	"data": {
		"id": "getPreferences",
		"preferences": [
			"twitchClientId"
		]
	},
}, function (data) {
	let baseNode = document.querySelector("#channel .ember-view .cn-metabar__viewcount");
	const reg_getId = /twitch\.tv\/([^\/\?]+)/,
		client_id = data.preferences.twitchClientId;

	setTimeout(()=>{
		if(baseNode===null){
			baseNode=document.querySelector('#root [data-a-target="channel-viewers-count"]');
			if(baseNode!==null){
				baseNode = baseNode.parentNode.parentNode;
			} else {
				baseNode = document.querySelector('#root [data-a-target="total-views-count"]');
				if(baseNode!==null){
					baseNode = baseNode.parentNode;
				}
			}
		}

		if(baseNode===null){
			console.info("Base node not found");
		} else if(typeof client_id !== "string" || client_id===""){
			console.info("Twitch API's client_id not found");
		} else if(reg_getId.test(location.href)){
			const [result, id] = reg_getId.exec(location.href);
			console.log(id);

			const request = new XMLHttpRequest();
			request.addEventListener("loadend", function(evt) {
				let data = null;
				try{
					data = JSON.parse(request.responseText);
				}
				catch(err){
					console.dir(request);
				}

				let channelCreatedDateNode = document.createElement("div");
				channelCreatedDateNode.title = "Channel creation date";
				channelCreatedDateNode.style.margin = "0 0.5em";
				channelCreatedDateNode.textContent = new Date(data.created_at).toLocaleString();
				baseNode.parentNode.insertBefore(channelCreatedDateNode, baseNode.nextSibling);
			}, false);
			request.open('GET', `https://api.twitch.tv/kraken/users/${id}?client_id=${client_id}`, true);
			request.send();
		}
	}, 500);
});


