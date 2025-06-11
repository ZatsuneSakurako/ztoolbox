/*		---- Nodes translation ----		*/
function translateNodes() {
	for (let node of document.querySelectorAll("[data-translate-id]")) {
		if (typeof node.tagName === "string") {
			node.textContent = chrome.i18n.getMessage(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}

function translateNodes_title() {
	for (let node of document.querySelectorAll("[data-translate-title]")) {
		if (typeof node.tagName === "string") {
			node.setAttribute(
				'title',
				chrome.i18n.getMessage(node.dataset.translateTitle)
			);
			delete node.dataset.translateTitle;
		}
	}
}

export async function loadTranslations() {
	let body = document.body,
		observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === "childList") {
					translateNodes(document);
					translateNodes_title(document);
				} else if (mutation.type === "attributes") {
					switch (mutation.attributeName) {
						case 'data-translate-id':
							translateNodes();
							break;
						case 'data-translate-title':
							translateNodes_title();
							break;
					}
				}
			});
		});

	// configuration of the observer:
	const config = {
		attributes: true,
		childList: true,
		subtree: true
	};

	translateNodes();
	translateNodes_title();

	// pass in the target node, as well as the observer options
	observer.observe(body, config);
}