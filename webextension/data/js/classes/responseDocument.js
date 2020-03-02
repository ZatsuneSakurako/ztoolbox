/**
 * Parse response body as HTML or XML document (proper Content-Type header must be available)
 * Method using DOMParse which doesn't allow to pass a custom URL base
 * @return {Promise<Document|XMLDocument>}
 */
Response.prototype.document = async function document() {
	const text = await this.text(),
		domParser = new DOMParser()
	;

	let mimeType;
	if (this.headers.has('Content-Type')) {
		mimeType = this.headers.get('Content-Type')
			.split(';')
			.find(s => /^[-\w.]+\/[-\w.]+$/i.test(s.trim()))
		;
	}

	return domParser.parseFromString(text, mimeType);
};
