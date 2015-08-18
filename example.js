var authState;

var auth = require('node-onedrive-auth').Provider({
	clientId: '',
	clientSeceret: '',
	scope: [],
	flow: 'code'
	port: 52763,
	authState: authState
});

auth.on('statechanged', function(state){
	authState = state;
});

auth.token().then(function(token){
	
});

auth.api({
	url: '',
	method: '',
	form: {}
}).done(function(call){

}, function(call){

});