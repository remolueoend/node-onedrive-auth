var path = require('path');

var auth = require('./lib/index').AuthProvider({
	clientId: '0000000048150D2D',
	clientSecret: '3B-vpMs6uabDFfDAh2hiPD3jC4tjoL4z',
	scope: ['wl.signin', 'wl.offline_access', 'onedrive.readwrite'],
	flow: 'code',
	port: 52763,
	authState: path.join(__dirname, 'auth-state.json')
});

auth.api({
	uri: 'https://api.onedrive.com/v1.0/drive/root:/Music'
}).done(function (result) {
	console.log(result.body);
}, function (result) {
	throw result.err;
});