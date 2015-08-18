
var AuthState = require('./AuthState');

/**
 * Handles the auth state.
 * @param {object} [authState={}] Default auth state.
 */
module.exports = function AuthStateFileHandler(authState){
	this.authState = authState instanceof AuthState ? 
		authState : new AuthState(authState);
}

/**
 * Updates the state.
 */
AuthHandler.prototype.update = function(state){
	if(state){
		this.authState = state instanceof AuthState ? 
			state : new AuthState(state);	
	}
}

/**
 * Returns the state.
 */
AuthHandler.prototype.get = function(){
	return this.authState;
}