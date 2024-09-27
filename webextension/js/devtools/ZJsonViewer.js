export class ZJsonViewer {
	/**
	 *  @type {any}
	 */
	#json;

	/**
	 *
	 * @param {any} json
	 */
	constructor(json) {
		this.#json = json;
	}

	/**
	 *
	 * @param {string} tagName
	 * @param {string|Array<string|HTMLElement>} content
	 * @param {...string[]} classList
	 * @returns {HTMLSpanElement}
	 */
	#createElement(tagName, content, ...classList) {
		const span = document.createElement(tagName);
		span.classList.add(...classList);
		if (Array.isArray(content)) {
			span.append(...content);
		} else {
			span.textContent = content;
		}
		return span;
	}

	#getValueType(value) {
		const type = typeof value;
		if (type === 'object') {
			if (Array.isArray(value)) {
				return 'array';
			}
			if (value === null) {
				return 'null';
			}
		}
		return type;
	}

	/**
	 *
	 * @param {string} str
	 * @return {Array<string|HTMLAnchorElement>}
	 */
	linkify(str) {
		const urlRegex = /([a-zA-Z]+?:\/\/(?:[^:]+:[^@]+@)?[a-zA-Z0-9.-]+(?:[a-zA-Z0-9\-_.!~*();\/?:&=+#%]*)*)/;
		return str.split(urlRegex)
			.map(str => {
				if (urlRegex.test(str)) {
					const link = document.createElement('a');
					link.href = str;
					link.target = '_blank';
					link.textContent = str;
					return link;
				}
				return str;
			})
			;
	}

	/**
	 *
	 * @param {any} data
	 * @param {HTMLElement} parentElement
	 * @param {number} [depth]
	 * @return {HTMLUListElement}
	 */
	#buildList(data, parentElement, depth = 0) {
		if (depth > 0) {
			const checkbox = document.createElement('input');
			checkbox.classList.add('collapse');
			checkbox.type = 'checkbox';
			checkbox.checked = depth !== 5;
			if (parentElement.children.length) {
				parentElement.insertBefore(checkbox, parentElement.children.item(0));
			} else {
				parentElement.appendChild(checkbox);
			}
		}

		const ul = document.createElement('ul');
		ul.classList.add("z-json-viewer");
		parentElement.appendChild(ul);

		const valueType = this.#getValueType(data);
		if (['null', 'undefined', 'string', 'number'].includes(valueType)) {
			parentElement.append(
				this.#createElement('span', data, `type-${valueType}`)
			);
			return;
		}

		ul.classList.add('type-object');
		for (const [key, value] of Object.entries(data)) {
			const li = document.createElement('li'),
				propertySpan = this.#createElement('span', key, 'property')
			;
			li.append(propertySpan);
			ul.append(li);

			if (Array.isArray(value)) {
				const checkbox = document.createElement('input');
				checkbox.classList.add('collapse');
				checkbox.type = 'checkbox';
				checkbox.checked = true;
				li.insertBefore(checkbox, propertySpan);

				const arrayUl = document.createElement('ol');
				arrayUl.classList.add('type-array');

				for (const item of value) {
					const arrayLi = document.createElement('li');
					if (typeof item === 'object') {
						this.#buildList(item, arrayLi, depth + 1);
					} else {
						arrayLi.append(this.#createElement('span', typeof item === 'string' ? this.linkify(item) : item, `type-${this.#getValueType(item)}`));
					}
					arrayUl.appendChild(arrayLi);
				}

				li.appendChild(arrayUl);
			} else if (typeof value === 'object') {
				this.#buildList(value, li, depth + 1);
			} else {
				li.append(this.#createElement('span', typeof value === 'string' ? this.linkify(value) : value, `type-${this.#getValueType(value)}`));
			}
		}

		return ul;
	}

	/**
	 *
	 * @param {HTMLElement} container
	 */
	render(container) {
		const ul = this.#buildList(this.#json, container);
		ul.classList.add('z-json-viewer-container');
	}
}