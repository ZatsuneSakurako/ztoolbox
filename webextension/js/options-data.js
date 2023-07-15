'use strict';

export const options = {
	"mode": {
		"type": "menulist",
		"value": "normal"
	},
	"notification_support": {
		"type": "checkbox",
		"value": true
	},
	/*			Features Prefs			*/
	"tabPageServerIp_alias": {
		"type": "json",
		"value": "{\"127.0.0.1\": \"localhost\"}",
		"group": "featurePreference",
		"sync": true
	},
	/*			Theme			*/
	"theme": {
		"type": "menulist",
		"value": "dark",
		"sync": true
	},
	"background_color": {
		"type": "color",
		"value": "#000000",
		"sync": true
	}
};
