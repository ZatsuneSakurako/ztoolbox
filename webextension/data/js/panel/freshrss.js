import {getPreference} from '../classes/chrome-preferences-2.js';

let freshRssCount = 0;
async function load() {
	const $freshRssContent = document.querySelector('#freshRssContent');
	if (!$freshRssContent) return;

	for (let child of $freshRssContent.children) {
		child.remove();
	}

	const node = document.createElement('iframe');
	const params = new URLSearchParams({
		a: 'normal',
		state: freshRssCount === 0 ? 1 : 2,
		znmCustomView: 1
	});
	node.src = await getPreference('freshRss_baseUrl') + "?" + params.toString()
	node.loading = 'lazy';
	$freshRssContent.append(node);
}

document.addEventListener('freshRssDataUpdate', function (e) {
	const freshRssData = e.detail;
	if (freshRssData && freshRssData.count !== undefined) {
		freshRssCount = freshRssData.count;
	}
})



function onSectionChange(target) {
	if (target.id === 'freshRssContentRadio') {
		load()
			.catch(console.error)
		;
	}
}
document.addEventListener('change', function (e) {
	const target = e.target.closest('[name="sections"]');
	if (!target) return;

	onSectionChange(target);
});
onSectionChange(document.querySelector('[name="sections"]:checked'));


let freshRss_showInPanel = false;
getPreference('freshRss_showInPanel')
	.then(value => {
		freshRss_showInPanel = value;
	})
;
document.addEventListener('click', function (e) {
	if (freshRss_showInPanel === false) return;
	const target = e.target.closest('[data-website="freshRss"][href]');
	if (!target) return;

	e.preventDefault();
	setTimeout(() => {
		document.querySelector('#freshRssContentRadio').click()
	})
});
