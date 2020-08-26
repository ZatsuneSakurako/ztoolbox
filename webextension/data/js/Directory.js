export class Directory extends Map {
	constructor(directory, parent) {
		super();
		this.systemObject = directory;
		this.parent = parent;
		/**
		 *
		 * @type {?Directory}
		 */
		this.root = null;
		if (directory.isFile === true) {
			throw new Error('NOT_DIRECTORY');
		}
	}

	/**
	 *
	 * @return {Directory}
	 */
	get parent() {
		return this._parent;
	}

	/**
	 *
	 * @param {Directory} parent
	 */
	set parent(parent) {
		this._parent = parent;

		this.root = null;
		if (!!parent && !!parent.parent) {
			this.root = parent;
			while (!!this.root.parent) {
				this.root = this.root.parent;
			}
		}
	}

	/**
	 *
	 * @return {Promise<Directory>}
	 */
	static getPackageDir() {
		return new Promise((resolve, reject) => {
			try {
				chrome.runtime.getPackageDirectoryEntry(function getPackageDirectory_callback(directory) {
					resolve(new Directory(directory));
				});
			} catch (e) {
				reject(e);
			}
		})
	}

	/**
	 *
	 * @param {string} key
	 * @return {object|Directory|undefined}
	 */
	get(key) {
		let value = super.get(key);

		if (key.indexOf('/') !== -1 || key.indexOf('\\') !== -1) {
			key = key.replace(/\\/ig, '/');

			if (key.indexOf('/') !== -1) {
				const path = (key === '/')? [''] : key.split('/');
				value = this;
				for (let i = 0; i < path.length; i++) {
					const element = path[i];

					if (element === '') {
						if (i === 0) {
							value = this.root === null? this : this.root;
						}
						continue;
					}

					value = value.get(element);
					if (value === undefined) break;
				}
			}
		}

		if (key === '..') {
			value = this.parent;
		} else if (key === '.') {
			value = this;
		}

		return value;
	}

	/**
	 *
	 * @param {string} key
	 * @return {boolean}
	 */
	has(key) {
		return this.get(key) !== undefined;
	}

	/**
	 *
	 * @throws READ_ONLY
	 * @param {string} key
	 * @param value
	 */
	set(key, value) {
		throw new Error('READ_ONLY');
	}

	/**
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader
	 * @return {Promise<Map<name, object|Directory>>}
	 */
	loadDirEntries() {
		const directory = this.systemObject;
		return new Promise((resolve, reject) => {
			const dirReader = directory.createReader();

			this.clear();
			dirReader.readEntries(entries => {
				entries.forEach(entry => {
					if (entry.isFile === true) {
						super.set(entry.name, entry);
					} else {
						const newDir = new Directory(entry, this);
						super.set(entry.name, newDir);
					}
				});
				resolve(this);
			}, reject);
		})
	}

	/**
	 *
	 * @return {Promise<Map<name, Object|Directory>>}
	 */
	async recursivelyGetEntries() {
		await this.loadDirEntries();
		const promises = [];

		for (let [, entry] of this) {
			if (entry instanceof Directory) {
				promises.push(
					new Promise(async resolve => {
						await entry.loadDirEntries();

						const promise = []

						for (let [, subEntry] of entry) {
							if (subEntry instanceof Directory) {
								promise.push(subEntry.recursivelyGetEntries());
							}
						}

						await Promise.all(promise);
						resolve();
					})
				)
			}
		}

		await Promise.all(promises);
		return this;
	}
}



export default Directory;
