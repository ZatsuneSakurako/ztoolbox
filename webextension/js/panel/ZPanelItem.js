/**
 * A context-menu command registered by a userscript.
 *
 * @typedef {object} ZMenuCommand
 * @property {string}   id          Command id (`data-userscript-menu-command`).
 * @property {string}   name        Visible label.
 * @property {string}   [title]     Tooltip; falls back to `name`.
 * @property {string}   [fileName]  Script that registered the command.
 * @property {string}   [icon]      Material symbol name, or an `https://` image URL.
 * @property {string}   [accessKey] Keyboard access key.
 * @property {boolean}  [autoClose] Close the menu after click. Default: true.
 * @property {boolean}  [iconOnly]  Render icon without label text. Default: false.
 */

/**
 * The `data` object attached to a list entry.
 * Like in the original template (`not item.data`), any falsy value
 * (false, null, undefined…) renders the "Aucun style" empty state.
 *
 * @typedef {object} ZItemData
 * @property {string|number}    id
 * @property {string}           [fileName]
 * @property {boolean}          [enabled]
 * @property {boolean}          [isCss]            True → user style (CSS).
 * @property {boolean}          [isScript]         True → userscript (JS).
 * @property {string[]}         [tags]
 * @property {boolean|null}     [isScriptExecuted]
 * @property {ZMenuCommand[]}   [menuCommands]
 */

/**
 * One list entry, as consumed by the components.
 *
 * @typedef {object} ZEntry
 * @property {string|null}              [title] Override text shown in the row title.
 * @property {ZItemData|false|null}     [data]  Falsy → "Aucun style" empty state.
 */

/** @constant {string} Src of the CSS logo icon (extension-internal asset). */
const CSS_LOGO_SRC = '/assets/img/Official_CSS_Logo.svg';

/** @constant {string} Src of the JS logo icon (extension-internal asset). */
const JS_LOGO_SRC = '/assets/img/JavaScript-logo.png';

/** @constant {string} Text shown when an entry has no data. */
const EMPTY_ITEM_LABEL = 'Aucun style';

/** @constant {string} Material glyph used when a menu command has no icon. */
const DEFAULT_MENU_ICON = 'manufacturing';

/** @constant {string} Non-breaking space used in the spacer label. */
const NO_BREAK_SPACE = '\u00A0';

/**
 * Creates an element, sets class and text content.
 *
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function elt(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Sets an attribute only when the value is defined.
 *
 * @param {Element} element
 * @param {string}  name
 * @param {string}  [value]
 * @returns {void}
 */
function setAttributeIfDefined(element, name, value) {
	if (value !== undefined && value !== null) element.setAttribute(name, value);
}

/**
 * Appends a lazily-loaded `<img>` icon.
 * `src` must be a static, extension-internal asset URL.
 *
 * @param {HTMLElement} parent
 * @param {string}      src
 * @param {string}      alt
 * @returns {void}
 */
function appendImageIcon(parent, src, alt) {
	const img = document.createElement('img');
	img.className = 'icon';
	img.src = src;
	img.alt = alt;
	img.loading = 'lazy';
	parent.append(img);
}

/**
 * Does this command belong to the given item?
 * Mirrors the template test `menuItem.fileName === item.data.fileName`,
 * including its quirk: `undefined === undefined` counts as a match.
 * Replace with `cmd?.fileName != null && cmd.fileName === data?.fileName`
 * if stricter semantics are wanted.
 *
 * @param {ZMenuCommand}   command
 * @param {ZItemData|null} itemData
 * @returns {boolean}
 */
function belongsToItem(command, itemData) {
	return command?.fileName === itemData?.fileName;
}

/**
 * Commands of `itemData` that will be rendered as menu buttons.
 *
 * @param {ZItemData|null} itemData
 * @returns {ZMenuCommand[]}
 */
function commandsFor(itemData) {
	return (itemData?.menuCommands ?? []).filter((cmd) => belongsToItem(cmd, itemData));
}

export class ZPanelItem extends HTMLElement {

	/**
	 * @type {ZEntry|null}
	 */
	#entry = null;

	constructor() {
		super();
	}

	/**
	 * Builds a `<z-panel-item>` row for one entry (append-style usage).
	 *
	 * @param {ZEntry} entry
	 * @returns {ZPanelItem}
	 */
	static build(entry) {
		const row = document.createElement('z-panel-item');
		row.item = entry;
		return row;
	}

	/**
	 * Replaces the whole row content with the given entry.
	 * Falsy data (`false`, `null`, `undefined`) is normalized to the
	 * empty state, matching the template's `not item.data`.
	 * The host class list is refreshed with the template wrapper's
	 * `fui-list-item …` classes.
	 *
	 * @param {ZEntry|null} entry
	 * @returns {void}
	 */
	set item(entry) {
		this.#entry = entry ?? null;
		this.#render();
	}

	/**
	 * Currently assigned entry.
	 *
	 * @returns {ZEntry|null}
	 */
	get item() {
		return this.#entry;
	}

	/**
	 * Rebuilds the row content on the host element itself:
	 *   <z-panel-item class="fui-list-item {type}{flags}">
	 *     [checkbox | empty icon]
	 *     <label class="title"> … </label>
	 *     [<div class="data"> … </div>]
	 *   </z-panel-item>
	 *
	 * @private
	 * @returns {void}
	 */
	#render() {
		this.replaceChildren();

		const data       = this.#entry?.data || null;
		const isExecuted = data?.isScriptExecuted === true;
		const hasMenu    = commandsFor(data).length > 0;

		this.setAttribute('name', `${data?.isCss ? 'userStyle' : 'userScript'}-${data.id.toString()}`);
		this.className = '';
		this.classList.add(...this.#computeItemClass(data, isExecuted, hasMenu));
		this.append(data ? this.#buildCheckbox(data) : this.#buildEmptyIcon());
		this.append(this.#buildTitle(data, isExecuted));
		if (hasMenu) this.append(this.#buildMenuPanel(data, isExecuted));
	}

	/**
	 * Class list, in template order: base + type + is-executed + no-data.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @param {boolean}        isExecuted
	 * @param {boolean}        hasMenu
	 * @returns {string}
	 */
	#computeItemClass(data, isExecuted, hasMenu) {
		const type = data?.isCss ? 'userStyle' : 'userScript';
		return [
			'fui-list-item',
			type,
			isExecuted && 'is-executed',
			!hasMenu && 'no-data',
		].filter(item => !!item);
	}

	/**
	 * The enable/disable checkbox bound to the entry.
	 *
	 * @private
	 * @param {ZItemData} data
	 * @returns {HTMLInputElement}
	 */
	#buildCheckbox(data) {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.name = `${data?.isCss ? 'userStyle' : 'userScript'}-${data.id}`;
		checkbox.value = data.fileName ?? '';
		checkbox.id = (data.id).toString();
		checkbox.checked = data.enabled === true;
		return checkbox;
	}

	/**
	 * Empty-state icon shown when the entry has no data.
	 *
	 * @private
	 * @returns {HTMLElement}
	 */
	#buildEmptyIcon() {
		return elt('span', 'icon material-symbols-outlined', 'tab');
	}

	/**
	 * Row title: label with tooltip, warning mark, type icons and text.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @param {boolean}        isExecuted
	 * @returns {HTMLLabelElement}
	 */
	#buildTitle(data, isExecuted) {
		const title = elt('label', 'title ellipse');

		if (data) {
			title.htmlFor = data.id.toString();
			title.title = this.#computeTooltip(data) ?? '';
			if (data.isScript && !isExecuted) title.append(this.#buildWarningMark(data));
			this.#addTypeIcons(title, data);
		}
		this.#addTitleText(title, data);

		return title;
	}

	/**
	 * Tooltip text: "Tag : a" or "Tags : a, b"; undefined without tags.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @returns {string|undefined}
	 */
	#computeTooltip(data) {
		const tags = data?.tags ?? [];
		if (tags.length === 0) return undefined;
		const noun = tags.length > 1 ? 'Tags' : 'Tag';
		return `${noun} : ${tags.join(', ')}`;
	}

	/**
	 * Warning glyph span for unexecuted scripts (empty glyph when disabled).
	 *
	 * @private
	 * @param {ZItemData} data
	 * @returns {HTMLElement}
	 */
	#buildWarningMark(data) {
		const glyph = data.enabled ? 'warning' : '';
		return elt('span', 'float-left material-symbols-outlined', glyph);
	}

	/**
	 * Adds the CSS and/or JS logo images depending on entry type.
	 *
	 * @private
	 * @param {HTMLLabelElement} title
	 * @param {ZItemData}        data
	 * @returns {void}
	 */
	#addTypeIcons(title, data) {
		if (data.isCss)    appendImageIcon(title, CSS_LOGO_SRC, 'css');
		if (data.isScript) appendImageIcon(title, JS_LOGO_SRC,  'js');
	}

	/**
	 * Adds the title text: entry override, or "Aucun style" when no data.
	 *
	 * @private
	 * @param {HTMLLabelElement} title
	 * @param {ZItemData|null}   data
	 * @returns {void}
	 */
	#addTitleText(title, data) {
		const overrideText = this.#entry?.title;
		const text = overrideText ?? (data ? undefined : EMPTY_ITEM_LABEL);
		if (text !== undefined) title.append(document.createTextNode(text));
	}

	/**
	 * `<div class="data">` — menu list when executed, spacer label otherwise.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @param {boolean}        isExecuted
	 * @returns {HTMLElement}
	 */
	#buildMenuPanel(data, isExecuted) {
		const panel = elt('div', 'data');
		panel.append(isExecuted ? this.#buildMenuList(data) : this.#buildSpacerLabel(data));
		return panel;
	}

	/**
	 * `<ul class="data-list">` with one button per matching command.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @returns {HTMLUListElement}
	 */
	#buildMenuList(data) {
		const list = elt('ul', 'data-list');
		for (const command of commandsFor(data)) {
			const cell = elt('li', 'data-list-item');
			cell.append(buildMenuButton(command, data?.fileName));
			list.append(cell);
		}
		return list;
	}

	/**
	 * Spacer label (`&nbsp;`) emitted when the script is not executed.
	 *
	 * @private
	 * @param {ZItemData|null} data
	 * @returns {HTMLLabelElement}
	 */
	#buildSpacerLabel(data) {
		const spacer = elt('label', 'd-block', NO_BREAK_SPACE);
		if (data) spacer.htmlFor = data.id.toString();
		return spacer;
	}
}

/**
 * Builds one `<button>` for a menu command.
 * Free function: it depends only on its arguments.
 *
 * @param {ZMenuCommand} command
 * @param {string=}      fileName Script the button belongs to (`data-target`).
 * @returns {HTMLButtonElement}
 */
function buildMenuButton(command, fileName) {
	const button = document.createElement('button');
	button.className = command.iconOnly ? 'ellipse icon-only' : 'ellipse';
	button.dataset.target = fileName ?? '';
	button.dataset.userscriptMenuCommand = command.id;
	button.title = command.title || command.name;
	setAttributeIfDefined(button, 'accesskey', command.accessKey);

	// Template default: auto-close unless explicitly disabled.
	if (command.autoClose !== false) button.dataset.userscriptAutoClose = '';

	appendIconToButton(button, command);
	if (!command.iconOnly) button.append(document.createTextNode(command.name));

	return button;
}

/**
 * Adds the command's icon to the button: remote icons (https://…) become
 * `<img>`, local names become material glyph spans.
 *
 * @param {HTMLButtonElement} button
 * @param {ZMenuCommand}      command
 * @returns {void}
 */
function appendIconToButton(button, command) {
	if (typeof command.icon === 'string' && command.icon.startsWith('https://')) {
		appendImageIcon(button, command.icon, '');
	} else {
		const glyph = command.icon || DEFAULT_MENU_ICON;
		button.append(elt('span', 'icon material-symbols-outlined', glyph));
	}
}

customElements.define('z-panel-item', ZPanelItem);
