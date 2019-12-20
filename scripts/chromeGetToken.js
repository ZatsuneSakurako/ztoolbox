require('dotenv').config();
const fetch = require('node-fetch');

const params = new URLSearchParams();
params.append('client_id', process.env.CHROME_CLIENT_ID);
params.append('client_secret', process.env.CHROME_CLIENT_SECRET);
params.append('code', process.env.CHROME_AUTH_CODE);

fetch('https://www.googleapis.com/oauth2/v4/token?' + params.toString() + '&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob')
	.catch(console.error)
	// .then(response => response.text())
	.then(console.dir)
;