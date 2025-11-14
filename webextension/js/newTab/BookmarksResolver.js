export class BookmarksResolver {
	/**
	 *
	 * @type {chrome.bookmarks.BookmarkTreeNode[]|null}
	 */
	#bookmarkTree=null;

	/**
	 *
	 * @type {chrome.bookmarks.BookmarkTreeNode[]|null}
	 */
	get #toolbarTree() {
		if (!this.#bookmarkTree) throw new Error('BOOKMARKS_NOT_LOADED');
		return this.#bookmarkTree.find(item => {
			return item.id === '1' || item.id === 'toolbar_____';
		}) ?? null;
	}

	/**
	 *
	 * @type {chrome.bookmarks.BookmarkTreeNode[]|null}
	 */
	get #mainTree() {
		if (!this.#bookmarkTree) throw new Error('BOOKMARKS_NOT_LOADED');
		return this.#bookmarkTree.find(item => {
			return item.folderType === "other" // chrome-based
				||
				item.id === 'menu________' // firefox
		}) ?? null;
	}

	async loadBookmarks() {
		if (!this.#bookmarkTree) {
			/**
			 *
			 * @type {chrome.bookmarks.BookmarkTreeNode[]}
			 */
			this.#bookmarkTree = (await chrome.bookmarks.getTree()).at(0).children;
		}
		return this.#bookmarkTree;
	}

	/**
	 *
	 * @param {...string[]} path
	 * @returns {chrome.bookmarks.BookmarkTreeNode|null}
	 */
	get(...path) {
		if (!this.#mainTree) {
			throw new Error('BOOKMARKS_NOT_LOADED');
		}


		const firstPathPart = path.shift();
		if (!firstPathPart) {
			return null;
		}
		let output = null;
		for (let treeNode of [this.#mainTree, this.#toolbarTree]) {
			output = treeNode.children.find(item => {
				return item.title === firstPathPart;
			}) ?? null;
			if (output) {
				break;
			}
		}


		if (path.length === 0) {
			return output;
		}
		for (let pathPart of path) {
			output = output.children.find(item => {
				return item.title === pathPart;
			}) ?? null;
			if (!output) {
				break;
			}
		}

		return output;
	}
}