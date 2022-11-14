import {getPreference} from '../classes/chrome-preferences-2.js';

function getVoiceLanguage(langCode) {
	let findVoice = function (langCode) {
		let result = null;
		let voices = speechSynthesis.getVoices();
		for (let voice of voices) {
			if (voice.lang.indexOf(langCode) !== -1) {
				result = voice;
				break;
			}
		}
		return result;
	};
	return new Promise(resolve => {
		let voices = speechSynthesis.getVoices();
		if (voices.length === 0) {
			speechSynthesis.onvoiceschanged = function () {
				voices = speechSynthesis.getVoices();
				if (voices.length > 0) {
					resolve(findVoice(langCode));
				}
			}
		} else {
			resolve(findVoice(langCode));
		}
	})
}

/**
 *
 * @param {string} langCode
 * @param {string} message
 */
export function voiceReadMessage(langCode, message) {
	let voiceReady = async function (data) {
		if (data.constructor.name === "SpeechSynthesisVoice") {
			let msg = new SpeechSynthesisUtterance();
			msg.voice = data; // Note: some voices don't support altering params
			const volume = await getPreference("vocal_volume");
			msg.volume = (typeof volume === "number") ? volume / 100 : 0.7; // 0 to 1
			msg.rate = 1; // 0.1 to 10
			msg.pitch = 1; //0 to 2
			msg.text = message;
			msg.onend = (event) => {
				console.group();
				console.info(message);
				console.dir(event);
				console.groupEnd();
			};
			speechSynthesis.speak(msg);
		} else {
			console.dir(data);
			throw "Error loading language";
		}
	};
	getVoiceLanguage(langCode)
		.then(voiceReady)
		.catch(voiceReady)
}
