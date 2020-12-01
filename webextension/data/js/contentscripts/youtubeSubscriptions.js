(async function youtubeSubscriptionsInit() {

	window.addEventListener('popstate', (event) => {
		console.log("location: " + document.location + ", state: " + JSON.stringify(event.state));
	});

	class InputManager {
		constructor(rootElement) {
			/**
			 * @type {Node}
			 * @private
			 */
			this._rootElement = rootElement;
			this._rootElement.style.display = 'none';

			/**
			 * @typedef {object} FieldData
			 * @property {string} id
			 * @property {HTMLFieldSetElement} $field
			 * @property {HTMLInputElement} $el
			 */

			/**
			 *
			 * @type {Map<string, FieldData>}
			 * @private
			 */
			this._fields = new Map();

			/**
			 *
			 * @type {HTMLStyleElement}
			 * @private
			 */
			this._style = document.createElement('style');
			this._rootElement.appendChild(this._style);

			this._$invert = InputManager._createField('invert');
			this._rootElement.appendChild(this._$invert.$field);
			this._$invert.$el.addEventListener('change', _.debounce(this.updateStyle, 50, {
				maxWait: 500
			}).bind(this));

			this.updateStyle();
		}

		/**
		 * @see https://stackoverflow.com/questions/105034/how-to-create-guid-uuid/2117523#2117523
		 * @return {string}
		 */
		static get uuid() {
			return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			);
		}

		/**
		 *
		 * @param {string} fieldName
		 * @return {FieldData}
		 * @private
		 */
		static _createField(fieldName) {
			const $field = document.createElement('fieldset'),
				randomId = InputManager.uuid,
				id = 'ztb_cat_chb_' + randomId
			;
			$field.style = `display: inline-block;`;

			const $el = document.createElement('input')
			$el.id = id;
			$el.name = fieldName;
			$el.type = 'checkbox';

			const label = document.createElement('label')
			label.htmlFor = id;
			label.textContent = fieldName;
			label.style = `color: white;
font-size: 1.2rem;
padding: 0.2rem;`;

			$field.append($el, label);
			return {
				id: randomId,
				$el,
				$field
			}
		}

		/**
		 *
		 * @param {string} catNames
		 */
		add(...catNames) {
			for (let catName of catNames) {
				const fieldData = InputManager._createField(catName);
				this._rootElement.appendChild(fieldData.$field);

				fieldData.$el.addEventListener('change', _.debounce(this.updateStyle, 50, {
					maxWait: 500
				}).bind(this));

				this._fields.set(catName, fieldData);
				this.updateStyle();
			}
		}

		set(...catNames) {
			this.add(...catNames);

			const deletedCategories = _.difference(Array.from(this._fields.keys()), catNames);
			for (let deletedCategory of deletedCategories) {
				this.delete(deletedCategory);
			}
		}

		get size() {
			return this._fields.size;
		}

		/**
		 *
		 * @param {string} catName
		 */
		delete(catName) {
			if (this._fields.has(catName) === false) {
				return false;
			}

			this._fields.get(catName).$field.remove();
			return this._fields.delete(catName);
		}

		clear() {
			this._fields.forEach((fieldData, catName) => {
				this.delete(catName);
			});
		}

		updateStyle() {
			this._style.textContent = this.toString();
			this._rootElement.style.display = this._fields.size === 0? 'none' : 'block';
		}

		/**
		 *
		 * @return {string}
		 */
		toString() {
			if (this._fields.size === 0) {
				return '';
			}

			const checkedCategories = Array.from(this._fields.keys())
				.filter(catName => {
					return this._fields.get(catName).$el.checked === true;
				})
			;

			if (checkedCategories.length === 0) {
				return '';
			}

			const categories = checkedCategories.map(catName => {
				return this._$invert.$el.checked === true?
					`ytd-grid-video-renderer:not(.ztl-cat-${this._fields.get(catName).id})`
					:
					`ytd-grid-video-renderer.ztl-cat-${this._fields.get(catName).id}`
				;
			});
			return `${categories.join(', ')} {
	visibility: hidden !important;
	order: 99999999;
}`
		}
	}
	const slashTrimmer = /^\/|\/$/g,
		rootSel = '.ytd-page-manager[page-subtype="subscriptions"][role="main"]',
		$subRoot = document.querySelector(rootSel)
	;

	if ($subRoot === null) {
		console.debug('[Z-Toolbox]', 'Not subscription page');
		return;
	}

	const rootElement = document.createElement('section'),
		inputManager = new InputManager(rootElement)
	;





	let youtubeSubscriptions;

	const onObservableCallback = _.debounce(function onObservableCallback(mutationList) {
		if (mutationList.length > 0) {
			loadCategories();
		}
	}, 500, {
		maxWait: 1000
	});

	const loadCategories = function loadCategories() {
		const $videos =
			Array.from($subRoot.querySelectorAll('#items > ytd-grid-video-renderer:not(.ztl-cat)'))
				.map($v => {
					const data = {
						$el: $v,
						title: $v.querySelector('h3').innerText.trim(),
						channelUrl: $v.querySelector('.ytd-channel-name a[href]').href
					};

					data.id = new URL(data.channelUrl).pathname.replace(slashTrimmer, '');
					for (let catName in youtubeSubscriptions) {
						if (!youtubeSubscriptions.hasOwnProperty(catName)) continue;

						$v.classList.add(`ztl-cat`);
						if (youtubeSubscriptions[catName].includes(data.id)) {
							$v.classList.add(`ztl-cat-${inputManager._fields.get(catName).id}`);
						}
					}

					return data;
				})
		;

		console.dir($videos)
	}

	chrome.runtime.sendMessage({
		"data": {
			"id": "getPreferences",
			"preferences": [
				"youtubeSubscriptions"
			]
		},
	}, function onPrefCallback(prefData) {
		if (prefData.preferences.hasOwnProperty('youtubeSubscriptions') === false) {
			return;
		}

		youtubeSubscriptions = prefData.preferences.youtubeSubscriptions;
		inputManager.set(...Object.keys(youtubeSubscriptions));
		if (inputManager.size === 0) {
			return;
		}

		document.querySelector('#masthead #center').append(rootElement);
		const observer = new MutationObserver(onObservableCallback);
		observer.observe(document.querySelector(rootSel), {
			childList: true,
			attributes: false,

			// Omit (or set to false) to observe only changes to the parent node
			subtree: true
		});

		loadCategories();
	});
})();