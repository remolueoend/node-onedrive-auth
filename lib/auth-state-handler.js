
module.exports = BaseAuthStateHandler;

var AuthState = require('./AuthState');

/**
 * Handles the auth state.
 * @param {object} [authState={}] Default auth state.
 */
function BaseAuthStateHandler(authState){
    this.authState = authState instanceof AuthState ? 
        authState : new AuthState(authState);
};

/**
 * Updates the state.
 */
BaseAuthStateHandler.prototype.update = function(state){
    if(state){
        this.authState = state instanceof AuthState ? 
            state : new AuthState(state);    
    }
};

/**
 * Returns the state.
 */
BaseAuthStateHandler.prototype.get = function(){
    return this.authState;
};