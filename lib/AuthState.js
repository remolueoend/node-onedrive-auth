
module.exports = AuthState;

var extend = require('extend'),
	stateDefs = {
	flow: 'code',
	scope: [],
	expires: 0
};

function AuthState(options){
	var opts = extend({}, stateDefs, options);
	this.scope = opts.scope;
	this.flow = opts.flow;
	this.accessToken = opts.accessToken;
	this.expires = opts.expires;
	this.refreshToken = opts.refreshToken;
	this.authCode = optrs.authCode;
};

AuthState.prototype.reset = function(){
	this.resetAccessToken();
	this.expires = 0;
	this.refreshToken = void 0;
};

AuthState.prototype.resetAccessToken = function(){
	this.accessToken = void 0;
};

AuthState.prototype.isExpired = function(){
	return this.expires < new Date().getTime();
};

AuthState.prototype.setAccessToken = function(token, expiresIn){
	this.accessToken = token;
	this.expires = new Date().getTime() + expiresIn;
};