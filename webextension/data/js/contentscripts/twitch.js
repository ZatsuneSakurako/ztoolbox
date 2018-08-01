(async function () {
	const reg_getId = /twitch\.tv\/([^\/?]+)/,
		reg_VideoUrl = /twitch\.tv\/videos\/[^\/?]+/
	;

	let baseNode = null;

	const onNodeState = function(node=document, state="complete", errorStates=[]){
		return new Promise((resolve, reject) => {
			if(node.readyState===state){
				resolve();
			} else {
				const onReadyStateChange = event => {
					if(event.target.readyState===state){
						node.removeEventListener('readystatechange', onReadyStateChange);
						resolve(event);
					} else if(errorStates.length>0 && errorStates.indexOf(event.target.readyState)!==-1){
						node.removeEventListener('readystatechange', onReadyStateChange);
						reject(event);
					}
				};

				node.addEventListener('readystatechange', onReadyStateChange);
			}
		})
	};
	const wait = function (millisecond) {
		return new Promise(resolve => {
			setTimeout(resolve, millisecond);
		})
	};
	const getPreference = function (preferenceId) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage({
				"data": {
					"id": "getPreferences",
					"preferences": [
						preferenceId
					]
				},
			}, function (data) {
				if(typeof data==="object" && data!==null && typeof data.preferences==="object" && data.preferences.hasOwnProperty(preferenceId)){
					resolve(data.preferences[preferenceId]);
				} else {
					reject(`Could not get preference "${preferenceId}"`);
				}
			});
		})
	};

	const getBaseNode = function () {
		let baseNode = document.querySelector("#channel .ember-view .cn-metabar__viewcount");
		if(baseNode!==null){
			return baseNode;
		}

		baseNode = document.querySelector('#root [data-a-target="channel-viewers-count"]');
		if(baseNode!==null) {
			return baseNode.parentNode.parentNode;
		}

		baseNode = document.querySelector('#root [data-a-target="total-views-count"]');
		if(baseNode!==null){
			return baseNode.parentNode;
		}

		baseNode = document.querySelector('#root .channel-header div[data-target="channel-header-left"]');
		if(baseNode!==null){
			return baseNode;
		}
	};

	/**
	 *
	 * @return {String | null}
	 */
	const getChannelId = function(){
		if(reg_VideoUrl.test(location.href)){
			const baseNode = document.querySelector('[data-target="channel-header__channel-link"]');

			if(baseNode!==null){
				const [,id] = reg_getId.exec(baseNode.href);
				return id;
			}
		} else if(reg_getId.test(location.href)){
			const [,id] = reg_getId.exec(location.href);
			return id;
		}

		return null;
	};



	await onNodeState(document, "complete");

	const client_id = await getPreference("twitchClientId");



	await wait(700);

	baseNode = getBaseNode();
	if(baseNode===null){
		console.info("Base node not found");
	} else if(typeof client_id !== "string" || client_id===""){
		console.info("Twitch API's client_id not found");
	} else if(reg_getId.test(location.href) || reg_VideoUrl.test(location.href)){
		const id = getChannelId();
		console.info(id);

		const request = new XMLHttpRequest();

		request.open('GET', `https://api.twitch.tv/kraken/users/${id}?client_id=${client_id}`, true);
		request.send();

		await onNodeState(request, XMLHttpRequest['DONE']);



		let data = null;
		try{
			data = JSON.parse(request.responseText);
		} catch(err){
			console.dir(request);
		}



		if(baseNode.dataset.target === "channel-header-left"){
			let channelCreatedDateNode__header = document.createElement("span");
			channelCreatedDateNode__header.classList.add("channel-header__item", "tw-align-items-center", "tw-flex-shrink-0");
			channelCreatedDateNode__header.innerHTML = `<div class="tw-flex tw-pd-x-2" title="Channel creation"><span class="tw-font-size-5">Creation</span><div class="channel-header__item-count tw-flex tw-mg-l-05"><span class="tw-font-size-5">${new Date(data.created_at).toLocaleString()}</span></div></div>`;


			baseNode.appendChild(channelCreatedDateNode__header);
		} else {
			let channelCreatedDateNode = document.createElement("div");
			channelCreatedDateNode.title = "Channel creation";
			channelCreatedDateNode.style.margin = "0 0.5em";
			channelCreatedDateNode.textContent = new Date(data.created_at).toLocaleString();


			baseNode.parentNode.insertBefore(channelCreatedDateNode, baseNode.nextSibling);
		}
	}
})();
