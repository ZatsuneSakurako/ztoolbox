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
				"value": "simplified",
				"label": "Simplified"
			},
			{
				"value": "normal",
				"label": "Normal"
			}
		]
	},
	"check_delay": {
		"title": "Streams status delay",
		"description": "Delay between checks, in minute",
		"type": "integer",
		"value": 5,
		"minValue": 5,
		"prefLevel": "advanced",
		"disabledInSimpleMode": true
	},
	/*			Features Prefs			*/
	"tabPageServerIp_alias": {
		"title": "IP aliases",
		"description": "IP/Name (IP as key)",
		"type": "json",
		"value": "{\"127.0.0.1\": \"localhost\"}",
		"group": "featurePreference"
	},
	/*			Notifications			*/
	"freshRss_baseUrl": {
		"title": "Base url of your FreshRss instance",
		"description": "Data refresh with url provided",
		"type": "string",
		"value": '',
		"group": "notifications",
		"prefLevel": "basic",
		"disabledInSimpleMode": true
	},
	"notify_checkedData": {
		"title": "Show a notification for deviantArt",
		"description": "Notification when checked",
		"type": "bool",
		"value": true,
		"group": "notifications",
		"prefLevel": "basic",
		"disabledInSimpleMode": true
	},
	"notify_all_viewed": {
		"title": "Show a notification when all view in website(s)",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "advanced",
		"disabledInSimpleMode": true
	},
	"notify_vocal": {
		"title": "Read a vocal notifications",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "basic",
		"onlyNormalMode": true
	},
	"vocal_volume": {
		"title": "Volume of vocal notifications",
		"description": "In percent",
		"type": "integer",
		"value": 70,
		"group": "notifications",
		"minValue": 0,
		"maxValue": 100,
		"rangeInput": true,
		"rangeOutputUnit": "%",
		"prefLevel": "basic",
		"onlyNormalMode": true
	},
	/*				Panel size					*/
	"panel_height": {
		"title": "Panel's height",
		"description": "Size in pixels",
		"type": "integer",
		"value": 350,
		"minValue": 350,
		"maxValue": 600,
		"rangeInput": true,
		"rangeOutputUnit": "px",
		"group": "panelSize",
		"prefLevel": "basic"
	},
	"panel_width": {
		"title": "Panel's width",
		"description": "Size in pixels",
		"type": "integer",
		"value": 290,
		"minValue": 290,
		"maxValue": 700,
		"group": "panelSize",
		"rangeInput": true,
		"rangeOutputUnit": "px",
		"prefLevel": "basic"
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
		"prefLevel": "basic",
		"sync": true,
		"disabledInDelegatedMode": true
	},
	"background_color": {
		"title": "Panel background color",
		"description": "Choose background color",
		"type": "color",
		"value": "#000000",
		"group": "theme",
		"prefLevel": "basic",
		"sync": true,
		"disabledInDelegatedMode": true
	},
	/*			Import/Export Prefs			*/
	"export_preferences": {
		"title": "Export preferences from a file",
		"label": "Export preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic",
		"disabledInDelegatedMode": true
	},
	"import_preferences": {
		"title": "Import preferences from a file",
		"label": "Import preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic",
		"disabledInDelegatedMode": true
	},
	/*			Settings level			*/
	"showAdvanced": {
		"title": "Show advanced settings",
		"description": "Enabled when checked",
		"type": "bool",
		"value": false,
		"group": "settingsLevel",
		"prefLevel": "basic"
	},
	"showExperimented": {
		"title": "Show setting for experimented users",
		"description": "Enabled when checked",
		"type": "bool",
		"value": false,
		"group": "settingsLevel",
		"showPrefInPanel": false,
		"prefLevel": "advanced"
	}
};
