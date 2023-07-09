export class WebsiteData {
	constructor() {
		this.count = 0;
		this.folders = new Map();
		this.websiteIcon = '';
		this.logged = null;
		this.loginId = '';
		this.href = '';
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