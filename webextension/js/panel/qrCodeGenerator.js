import QrCreator from "../../lib/qr-creator.es6.min.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";

const currentTab = await getCurrentTab().catch(console.error);
if (currentTab) {
	QrCreator.render({
		text: currentTab.url,
		radius: 0, // 0.0 to 0.5
		ecLevel: 'M', // L, M, Q, H
		fill: '#000', // foreground color
		background: '#FFF', // color or null for transparent
		size: 256 // in pixels
	}, document.querySelector('#qr-code'));
}