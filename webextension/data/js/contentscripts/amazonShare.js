(async function amazonShare_init(document) {
	async function copyToClipboard(string) {
		try {
			await navigator.clipboard.writeText(string);
			return true;
		} catch (e) {
			console.error(e);
			return false;
		}
	}

	async function notifyMe(msg) {
		if (Notification.permission === 'granted') {
			// If it's okay let's create a notification
			return new Notification('Z-Toolbox', {
				body: msg,
				silent: true
			});
		} else if (Notification.permission !== 'denied' || Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			// If the user accepts, let's create a notification
			if (permission === 'granted') {
				notifyMe.apply(this, arguments);
			}
		}
	}



	chrome.runtime.sendMessage({
		"id": "getPreferences",
		"data": {
			"preferences": [
				"amazonShareLink"
			]
		},
	}, async function(data) {
		if (!(data.preferences.hasOwnProperty('amazonShareLink') && data.preferences.amazonShareLink === true)) {
			return;
		}

		const linkRegex = /https:\/\/www\.amazon\.fr\/[^ ]+/gm,
			$swfMailTo = document.querySelector('#swfMailTo'),
			$productTitle = document.querySelector('#productTitle')
			// $selectedImg = document.querySelector('#main-image-container li.selected img')
		;
		console.log($swfMailTo, $productTitle)

		const newLink = document.createElement('button');
		newLink.classList.add('a-link-normal', 'email');
		newLink.textContent = '🔗';
		newLink.style.margin = '0 0.4em';
		newLink.addEventListener('click', async function () {
			let priceTxt = 'Aucun prix';
			const priceSelectors = [
				'#price_inside_buybox',
				'#buyBoxAccordion > .a-accordion-active h5'
			];
			for (let sel of priceSelectors) {
				const $priceNode = document.querySelector(sel);
				if ($priceNode !== null) {
					priceTxt = $priceNode.innerText.trim().replace(/\n+/gi, ' ');
					break;
				}
			}

			const result = await copyToClipboard(`${$productTitle.innerText.trim()} (${priceTxt})
${new URL($swfMailTo.href).searchParams.get('body').match(linkRegex)[0]}`);

			/* Alert the copied text */
			notifyMe(!!result ? 'Copié !' : 'Erreur lors de la copie');
		});
		$swfMailTo.after(newLink);
	});
})(document);
