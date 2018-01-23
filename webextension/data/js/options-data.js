'use strict';

const options = {
	"check_delay": {
		"title": "Streams status delay",
		"description": "Delay between checks, in minute",
		"type": "integer",
		"value": 5,
		"minValue": 1,
		"prefLevel": "advanced"
	},
	"timeout_delay": {
		"title": "Streams timeout delay",
		"description": "Timeout delay of requests, in sec (between 10 and 30)",
		"type": "integer",
		"value": 30,
		"minValue": 10,
		"maxValue": 30,
		"rangeInput": true,
		"rangeOutputUnit": "s",
		"group": "checking",
		"prefLevel": "experimented"
	},
	/*			Features Prefs			*/
	"twitchClientId": {
		"title": "Twitch API's client id",
		"description": "Twitch API for more information",
		"type": "string",
		"value": "",
		"group": "featurePreference"
	},
	"hourlyAlarm": {
		"title": "Hourly alarm",
		"description": "Display a notification per hour when checked",
		"type": "bool",
		"value": false,
		"group": "featurePreference"
	},
	"hourlyAlarm_sound": {
		"title": "Play sound with notifications",
		"description": "Import audio file",
		"label": "Import",
		"type": "file",
		"fileMaxSize": 5 * 1024 * 1024,
		"inputAccept": "audio/*",
		"fileTypes": /^audio\//,
		"readType": "dataUrl",
		"value": {},
		"group": "featurePreference"
	},
	"hourlyAlarm_sound_volume": {
		"title": "Sound volume for the notification",
		"description": "In percent",
		"type": "integer",
		"value": 70,
		"minValue": 0,
		"maxValue": 100,
		"rangeInput": true,
		"rangeOutputUnit": "%",
		"prefLevel": "basic",
		"group": "featurePreference"
	},
	/*			Notifications			*/
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
		"title": "Volume of vocal notifiations",
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
	"panel_theme": {
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