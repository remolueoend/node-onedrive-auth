var path = require('path');

var auth = require('./lib/index').AuthProvider({
	clientId: '0000000048150D2D',
	clientSecret: 'hG9BZpcd3tkiHCmfDp-HvvAfJa2yaRFj',
	scope: ['wl.signin', 'wl.offline_access', 'onedrive.readwrite'],
	flow: 'code',
	port: 52763,
	authState: path.join(__dirname, 'auth-state.json')
});

auth.token().then(function(token){
	console.log(token);
}).done();