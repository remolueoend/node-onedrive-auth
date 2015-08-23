
module.exports = AuthState;

var extend = require('extend'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
	stateDefs = {
	flow: 'code',
	scope: [],
	expires: 0
};

function AuthState(options){
    EventEmitter.call(this);

	var opts = extend({}, stateDefs, options);
	var scope = opts.scope;
	var flow = opts.flow;
	var accessToken = opts.accessToken;
	var expires = opts.expires;
	var refreshToken = opts.refreshToken;
	var authCode = opts.authCode;

    this.scope = Object.defineProperty(this, 'scope', {
        get: function(){ return scope; },
        set: function (val) { scope = val; this.emit('change'); }
    });
    this.flow = Object.defineProperty(this, 'flow', {
        get: function(){ return flow; },
        set: function (val) { scope = val; this.emit('change'); }
    });
    this.accessToken = Object.defineProperty(this, 'accessToken', {
        get: function(){ return accessToken; },
        set: function (val) { scope = val; this.emit('change'); }
    });
    this.expires = Object.defineProperty(this, 'expires', {
        get: function(){ return expires; },
        set: function (val) { scope = val; this.emit('change'); }
    });
    this.refreshToken = Object.defineProperty(this, 'refreshToken', {
        get: function(){ return refreshToken; },
        set: function (val) { scope = val; this.emit('change'); }
    });
    this.authCode = Object.defineProperty(this, 'authCode', {
        get: function(){ return authCode; },
        set: function (val) { scope = val; this.emit('change'); }
    });
}
util.inherits(AuthState, EventEmitter);

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
	this.expires = new Date().getTime() + parseInt(expiresIn) * 1000;
};