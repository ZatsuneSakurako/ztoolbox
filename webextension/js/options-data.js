'use strict';

export const options = {
	"mode": {
		"title": "Extension mode",
		"description": "Choose extension mode",
		"type": "menulist",
		"value": "normal",
		"options": [
			{
				"value": "delegated",
				"label": "External"
			},
			{
				"value": "normal",
				"label": "Normal"
			}
		]
	},
	"notification_support": {
		"title": "Accept notifications from chrome native messaging (external mode only)",
		"description": "Enabled if checked",
		"type": "bool",
		"value": true,
		"onlyDelegatedMode": true
	},
	/*			Features Prefs			*/
	"tabPageServerIp_alias": {
		"title": "IP aliases",
		"description": "IP/Name (IP as key)",
		"type": "json",
		"value": "{\"127.0.0.1\": \"localhost\"}",
		"group": "featurePreference",
		"sync": true,
		"disabledInDelegatedMode": true
	},
	/*			Theme			*/
	"theme": {
		"title": "Panel theme",
		"description": "Choose the panel of the panel",
		"type": "menulist",
		"value": "dark",
		"options": [
				{
					"value": "dark",
					"label": "Dark"
				},
				{
					"value": "light",
					"label": "Light"
				}
			],
		"group": "theme",
		"sync": true,
		"disabledInDelegatedMode": true
	},
	"background_color": {
		"title": "Panel background color",
		"description": "Choose background color",
		"type": "color",
		"value": "#000000",
		"group": "theme",
		"sync": true,
		"disabledInDelegatedMode": true
	}
};
