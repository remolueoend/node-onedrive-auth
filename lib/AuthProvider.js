
module.exports = AuthProvider;

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	q = require('deferred'),
	extend = require('extend'),
	AuthState = require('./AuthState'),
	base = require('./base-auth'),
    request = require('request'),
	BaseAuthStateHandler = require('./auth-state-handler'),
	AuthStateFileHandler = require('./auth-state-file-handler'),
    httpError = require('./http-error'),
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
	var opts = extend({}, providerDefs, options),
        _this = this;
	
	this.clientId = opts.clientId;
	this.clientSecret = opts.clientSecret;
	this.authState = new AuthState(opts.authState);
	this.scope = opts.scope;
	this.flow = opts.flow;
	this.port = opts.port;

    this.authState.on('change', function(state){
        _this.emit('statechange', _this.authState);
    });
}
util.inherits(AuthProvider, EventEmitter);

/**
 * Validates the current auth state. This method must be called
 * before accessing the accessToken of the current auth state.
 * It checks the expiration time and tracks any changes of the scope or auth flow.
 * If the state is not valid anymore, parts of or the full state gets resetted.
 */
AuthProvider.prototype.__validateState = function(){
	var state = this.authState;
	// if auth expired, reset access Token:
	if(state.isExpired() && state.accessToken){
		state.resetAccessToken();
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
		state = this.__validateState(),
        _this = this;
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
				_this.__requestingD = void 0;
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
 * @param {function} [callback] An optional callback to execute.
 * @param {number} [recStat] internal recursive counter.
 * Do not set this parameter manually.
 * @returns {void 0}|{Promise}
 */
AuthProvider.prototype.api = function(req, callback, recStat){
	var d = q(),
		_this = this,
        rs = typeof recStat === 'number' ? recStat : 0;

	var cb = function(err, r, b){
        // full reset and recall only makes sense when flow is set to 'code':
        var state = _this.authState.get(),
            callRec =
            rs === 0 || rs === 1 && state.flow === 'code';
		if(r.statusCode === 401 && callRec){
            // first call: reset token only and call again:
            if(rs === 0){
                state.resetAccessToken();
            }else{
                // second call: reset whole state and call last time:
                state.reset();
            }
            _this.__stateChanged();
            // call api recursively:
			if(callback){
				_this.api(req, callback, rs + 1);
			}else{
				d.resolve(_this.api(req, void 0, rs + 1));
			}
		}else{
            // create a custom error for
            if(!callRec){
                err = new Error('Authentication failed multiple times after automatic reset.');
            }else{
                err = err || httpError.fromServer(err, r, b);
            }
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
		req.headers.Authorizations2 = 'bearer ' + token;

		request(req, cb);
	}, function (err) {
        if(callback){
            callback(err);
        }else{
            d.reject(err);
        }
    }).done();

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
	this.__stateChanged();
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