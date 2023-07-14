export class WebsiteData {
	#websiteAPI;
	constructor(websiteApi) {
		this.#websiteAPI = websiteApi;

		this.count = 0;
		this.folders = new Map();
		this.websiteIcon = websiteApi.defaultFavicon ?? '';
		this.logged = null;
		this.loginId = '';
	}

	get href() {
		return !!this.logged ? this.#websiteAPI.getViewURL(this) : this.#websiteAPI.getLoginURL
	}

	toJSON() {
		return {
			count: this.count,
			folders: [...this.folders.entries()],
			websiteIcon: this.websiteIcon,
			logged: this.logged,
			loginId: this.loginId,
			href: this.href,
		}
	}
}