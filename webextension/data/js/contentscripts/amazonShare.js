(async function amazonShare_init(document) {
	function copyToClipboard(string) {
		if (document.querySelector('#copy_form') !== null) {
			let node = document.querySelector('#copy_form');
			node.parentNode.removeChild(node);
		}

		let copy_form = document.createElement('textarea');
		copy_form.id = 'copy_form';
		copy_form.textContent = string;
		//copy_form.class = "hide";
		copy_form.setAttribute('style', 'height: 0 !important; width: 0 !important; border: none !important; z-index: -9999999;');
		document.querySelector('body').appendChild(copy_form);

		//copy_form.focus();
		copy_form.select();

		let clipboard_success = document.execCommand('Copy');
		copy_form.parentNode.removeChild(copy_form);

		return clipboard_success;
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
		"data": {
			"id": "getPreferences",
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
		newLink.addEventListener('click', function () {
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

			const result = copyToClipboard(`${$productTitle.innerText.trim()} (${priceTxt})
${new URL($swfMailTo.href).searchParams.get('body').match(linkRegex)[0]}`);

			/* Alert the copied text */
			notifyMe(!!result ? 'Copié !' : 'Erreur lors de la copie');
		});
		$swfMailTo.after(newLink);
	});
})(document);
