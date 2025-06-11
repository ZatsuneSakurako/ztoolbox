function onImageLoad() {
	this.removeEventListener('load', onImageLoad);
	this.removeEventListener('error', onImageLoad);
	this.classList.toggle('image-error', this.complete && this.naturalWidth === 0);
}

export const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (let addedNode of mutation.addedNodes) {
			const target = mutation.target,
				images = target.tagName === 'IMG'? [target] : target.querySelectorAll('img')
			;
			for (const image of images) {
				image.addEventListener('load', onImageLoad);
				image.addEventListener('error', onImageLoad);
			}
		}
	}
});

observer.observe(document, {
	attributes: false,
	childList: true,
	subtree: true,
});
