import {appendTo} from "../utils/appendTo.js";
import {renderTemplate} from "../init-templates.js";
import {getCurrentTab} from "./getCurrentTab.js";

async function loadTabOpenGraph(activeTab) {
	return await chrome.scripting.executeScript({
			target: {
				tabId: activeTab.id,
			},
			files: [
				'/js/contentscripts/openGraphData.js'
			],
			injectImmediately: true
		})
			.catch(console.error)
	;
}

export async function updateData() {
	const $openGraphData = document.querySelector(`#openGraphData`);

	for (let node of [...$openGraphData.children]) {
		node.remove();
	}

	const activeTab = await getCurrentTab();
	if (!activeTab) {
		return;
	}



	const tabOpenGraphData = await loadTabOpenGraph(activeTab)
		.catch(console.error)
	;
	console.log('openGraphData', tabOpenGraphData);
	if (!tabOpenGraphData || !Array.isArray(tabOpenGraphData) || !tabOpenGraphData.at(0)) {
		throw new Error('OPEN_GRAPH_DATA_ERROR');
	}



	const openGraphData = tabOpenGraphData.at(0).result;
	appendTo($openGraphData, await renderTemplate("openGraphData", {
		data: openGraphData,
		code: JSON.stringify(openGraphData, null, '  ')
	}));
}

document.addEventListener('click', function (ev) {
	const elm = ev.target.closest('#openGraphData .buttonItem');
	if (!elm) return;

	const $title = elm.querySelector('.title'),
		$data = elm.querySelector('.data'),
		currentState = elm.classList.contains('extended')
	;
	elm.classList.toggle('extended', !currentState);
	$title.classList.toggle('ellipse', currentState);
	$data.classList.toggle('ellipse', currentState);
})
