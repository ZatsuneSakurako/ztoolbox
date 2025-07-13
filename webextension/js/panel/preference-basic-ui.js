import {getPreferences, savePreference} from '../classes/chrome-preferences.js';

export async function loadPreferencesNodes() {
	const values = await getPreferences('background_color', 'theme'),
		$inputs = document.querySelector('#background_color,#theme');
	for (const $input of $inputs) {
		const value  = values.get($input.id);
		if (value !== undefined) {
			$input.value = value;
		}
	}
}
document.addEventListener('change', function (e) {
	const input = e.target.closest("input#background_color,select#theme");
	if (!input) return;

	if (input.validity.valid) {
		savePreference(input.id, input.value)
			.catch(console.error)
		;
	}
});
