
module.exports = AuthProvider;

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	q = require('deferred'),
	extend = require('extend'),
	AuthState = require('./AuthState'),
	base = require('./base-auth'),
	BaseAuthStateHandler = require('./auth-state-handler'),
	AuthStateFileHandler = require('./auth-state-file-handler'),
	providerDefs = {
		flow: 'code',
		authState: new AuthState(),
		port: 52763,
		scope: []
	};

/**
 * Offers access to a valid OneDrive API access token,
 * helps executing authenticated api calls and manages the
 * current authentication state.
 * This function can be called with or without 'new'.
 * @param {object} options Provider options.
 * @returns {AuthProvider} new AuthProvider instance.
 */
function AuthProvider(options){
	if(!(this instanceof AuthProvider)){
		return new AuthProvider(options);
	}
	EventEmitter.call(this);
	var opts = extend({}, providerDefs, options);
	
	this.clientId = opts.clientId;
	this.clientSecret = opts.clientSecret;
	this.__resolveAuthState(opts.authState);
	this.scope = opts.scope;
	this.flow = opts.flow;
	this.port = opts.port;
}
util.inherits(AuthProvider, EventEmitter);

/**
 * Resolves the provided authSTate object and returns an instance
 * of BaseAuthStateHandler or a subclass.
 * @param {string|object|undefined} obj object to resolve.
 * @returns {BaseAuthStateHandler}
 */
AuthProvider.prototype.__resolveAuthState = function(obj){
	var type = typeof obj;
	if(type ==='string'){
		this.authState = new AuthStateFileHandler({}, obj);
	}else{
		this.authState = new BaseAuthStateHandler(obj || {});
	}
};

/**
 * Validates the current auth state. This method must be called
 * before accessing the accessToken of the current auth state.
 * It checks the expiration time and tracks any changes of the scope or auth flow.
 * If the state is not valid anymore, parts of or the full state gets resetted.
 */
AuthProvider.prototype.__validateState = function(){
	var state = this.authState.get();
	// if auth expired, reset access Token:
	if(state.isExpired() && state.accessToken){
		state.resetAccessToken();
		this.__stateChanged();
	}
	// if flow or scope changed, reset whole authentication:
	if(!this.__compareScope(state.scope) || 
		this.flow !== state.flow){
		state.reset();
		state.scope = this.scope;
		state.flow = this.flow;
		this.__stateChanged();
	}
    return this.authState.get();
};

/**
 * Emits the instance's statechanged event. 
 */
AuthProvider.prototype.__stateChanged = function(){
	this.authState.update();
	this.emit('statechanged', this.authState.authState);
};

/**
 * Compares the current scope with the given one.
 * If the current scope contains an element which is not present
 * in the given one (=> current scope was expanded), this method returns false.
 * @param {Array<string>} The old scope to compare.
 * @returns {boolean}
 */
AuthProvider.prototype.__compareScope = function(oldScope){
	if(this.scope.length !== oldScope.length) return false;
	this.scope.forEach(function(s){
		if(oldScope.indexOf(s) === -1){
			return false;
		}
	});
	return true;
};

/**
 * Returns a promise which resolves an access token.
 * The resolved access token can be used for OneDrive API calls.
 * @returns {Promise} promise resolving an access token for api calls.
 */
AuthProvider.prototype.token = function(){
	var d = q(),
		state = this.__validateState();
	if(state.accessToken){
		d.resolve(state.accessToken);
	}else{
		if(this.__requestingD){
			d.resolve(this.__requestingD.promise);
		}else{
			this.__requestingD = d;
			var exec; 
			if(state.flow === 'code'){
				exec = this.__getTokenByCode;
			}else if(state.flow === 'token'){
				exec = this.__getSingleToken;
			}else{
				throw 'invalid auth flow in current auth state. \
				only \'token\' or \'code\' is allowed.';
			}

			exec.call(this).then(function(result){
				this.__requestingD = void 0;
				d.resolve(result);
			}, function(err){
                d.reject(err);
            }).done();
		}
	}

	return d.promise;
};

/**
 * Executes an http request based on the given request options.
 * If no callback is provided, a promise will be returned.
 * @param {object} req Request options. 
 * See npm request package for more details.
 * @param {function} [callback] An optional caallback to execute.
 * @returns {void 0}|{Promise}
 */
AuthProvider.prototype.api = function(req, callback){
	var d = q(),
		_this = this;

	var cb = function(err, r, b){
		if(r.statusCode === 401){
			_this.reset();
			if(callback){
				_this.api(req, callback);
			}else{
				d.resolve(_this.api(req));
			}
		}else{
			if(callback){
				callback(err, r, b);
			}else{
				var res = err ? d.reject : d.resolve;
				res.call(d, { err: err, res: r, body: b });
			}
		}
	};

	this.token().then(function(token){
		req.headers = req.headers || {};
		req.headers.Authentication = 'bearer ' + token;

		request(req, cb);
	});

	if(!callback){
		return d.promise;
	}
};

/**
 * Resets the current auth state. After calling this method,
 * the authentication process will start over as soon as an
 * access token is requested.
 */
AuthProvider.prototype.reset = function(){
	this.authState.get().reset();
	this.stateChanged();
};

AuthProvider.prototype.__getSingleToken = function(){
	var state = this.authState.get(),
		_this = this;
	return base.getAccessToken({
		clientId: this.clientId,
		redirPort: this.port,
		scope: this.scope
	}).then(function(result){
		state.setAccessToken(result.access_token, result.expires_in);
		_this.__stateChanged();
		return result.access_token;
	});
};

AuthProvider.prototype.__getTokenByCode = function(){
	var state = this.authState.get(),
		_this = this;
	if(state.refreshToken || state.authCode){
		return base.getTokenByCode({
			clientId: this.clientId,
			clientSecret: this.clientSecret,
			redirPort: this.port,
			code: state.authCode,
			refreshToken: state.refreshToken		
		}).then(function(result){
			state.setAccessToken(
				result.access_token, result.expires_in);
			state.refreshToken = result.refresh_token;
            state.authCode = void 0;
			_this.__stateChanged();
			return state.accessToken;
		});
	}else{
		var state = this.authState.get(),
			_this = this;
		return base.getAuthToken({
			clientId: this.clientId,
			redirPort: this.port,
			scope: this.scope
		}).then(function(code){
			state.authCode = code;
			_this.__stateChanged();
			return _this.__getTokenByCode();
		});
	}
};