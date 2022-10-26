'use strict';

export const options = {
	"check_enabled": {
		"title": "Data automatic refresh enabled",
		"description": "Enabled if checked",
		"type": "bool",
		"value": true,
		"prefLevel": "advanced"
	},
	"check_delay": {
		"title": "Streams status delay",
		"description": "Delay between checks, in minute",
		"type": "integer",
		"value": 5,
		"minValue": 5,
		"prefLevel": "advanced"
	},
	/*			Features Prefs			*/
	"launchpadAddLink": {
		"title": "Add link to go back to PPA page from index page",
		"description": "Will link if checked",
		"type": "bool",
		"value": false,
		"group": "featurePreference"
	},
	"custom_lstu_server": {
		"title": "Custom LSTU server",
		"description": "LSTU server, for example https://lstu.fr/",
		"type": "string",
		"value": "",
		"group": "featurePreference"
	},
	"tabPageServerIp_alias": {
		"title": "IP aliases",
		"description": "IP/Name (IP as key)",
		"type": "json",
		"value": "{\"127.0.0.1\": \"localhost\"}",
		"stringList": true,
		"group": "featurePreference"
	},
	/*			Notifications			*/
	"freshRss_baseUrl": {
		"title": "Base url of your FreshRss instance",
		"description": "Data refresh with url provided",
		"type": "string",
		"value": '',
		"group": "notifications",
		"prefLevel": "basic"
	},
	"notify_checkedData": {
		"title": "Show a notification for deviantArt",
		"description": "Notification when checked",
		"type": "bool",
		"value": true,
		"group": "notifications",
		"prefLevel": "basic"
	},
	"notify_all_viewed": {
		"title": "Show a notification when all view in website(s)",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "advanced"
	},
	"notify_vocal": {
		"title": "Read a vocal notifications",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "basic"
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
		"prefLevel": "basic"
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
		"prefLevel": "basic"
	},
	"background_color": {
		"title": "Panel background color",
		"description": "Choose background color",
		"type": "color",
		"value": "#000000",
		"group": "theme",
		"prefLevel": "basic"
	},
	/*			Import/Export Prefs			*/
	"export_preferences": {
		"title": "Export preferences from a file",
		"label": "Export preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic"
	},
	"import_preferences": {
		"title": "Import preferences from a file",
		"label": "Import preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic"
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
