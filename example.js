var path = require('path');

var auth = require('./lib/index').AuthProvider({
	clientId: 'client_id',
	clientSecret: 'client_secret',
	scope: ['wl.signin', 'wl.offline_access', 'onedrive.readwrite'],
	flow: 'code',
	port: 52763,
	authState: path.join(__dirname, 'auth-state.json')
});

auth.token().then(function(token){
	console.log(token);
}).done();