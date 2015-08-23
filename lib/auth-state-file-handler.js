
module.exports = AuthStateFileHandler;

var fs = require('fs'),
    util = require('util'),
    BaseAuthStateHandler = require('./auth-state-handler');
    
/**
 * Handles the auth state cached on the file system.
 * @param {object} [authState={}] Default auth state used when the provided
 * file does not exist yet.
 * @param {string} file An absolute file path where the state should be safed.
 */
function AuthStateFileHandler(authState, file){
    BaseAuthStateHandler.call(this, authState);
    this.file = this.__resolveDescriptor(file);
};
util.inherits(AuthStateFileHandler, BaseAuthStateHandler);

/**
 * Resolves the given file object. Used as soon as file descriptors are supported too.
 * @param {number|string} File descriptor or file path.
 * @private
 */
AuthStateFileHandler.prototype.__resolveDescriptor = function(file){
    var type = typeof file;
    if(type === 'string'){
        return file;
    }else{
        //throw 'only file pathes are supported.';
        return void 0;
    }
}

/**
 * Updates the state.
 */
AuthStateFileHandler.prototype.update = function(state){
    AuthStateFileHandler.super_.prototype.update.call(this, state);
    if(this.file){
        fs.writeFileSync(this.file, JSON.stringify(this.authState), {encoding: 'utf8'});
    }
}

/**
 * Returns the state.
 */
AuthStateFileHandler.prototype.get = function(){
    if(this.file && fs.existsSync(this.file)){
        var raw = JSON.parse(fs.readFileSync(this.file, {encoding: 'utf8'}));
        AuthStateFileHandler.super_.prototype.update.call(this, raw);
    }
    return AuthStateFileHandler.super_.prototype.get.call(this);
}