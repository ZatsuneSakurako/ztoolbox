export function load() {
	const $freshRssContent = document.querySelector('#freshRssContent');
	if (!$freshRssContent) return;

	for (let child of $freshRssContent.children) {
		child.remove();
	}

	const node = document.createElement('iframe');
	node.src = getPreference('freshRss_baseUrl') + "?a=normal&state=3&znmCustomView=1"
	node.loading = 'lazy';
	$freshRssContent.append(node);
}



function onSectionChange(target) {
	if (target.id === 'freshRssContentRadio') {
		load()
	}
}
document.addEventListener('change', function (e) {
	const target = e.target.closest('[name="sections"]');
	if (!target) return;

	onSectionChange(target);
});
onSectionChange(document.querySelector('[name="sections"]:checked'));



document.addEventListener('click', function (e) {
	const target = e.target.closest('[data-website="freshRss"]');
	if (!target) return;

	e.stopPropagation();
	e.stopImmediatePropagation();
	setTimeout(() => {
		document.querySelector('#freshRssContentRadio').click()
	})
})