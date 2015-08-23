
module.exports = authHandler;

var AuthProvider = require('./AuthProvider'),
    fs = require('fs'),
    extend = require('extend'),
    pather = require('path'),
    defaults = {
        authState: pather.join(__dirname, 'auth-state.json')
    };

/**
 * Redireects a function call to the given context's method.
 * @param {object} context The context under which the new call should be done.
 * @param {string} fn The name of the function to call.
 * @param {Arguments} arguments The argument-collection.
 * @returns {*}
 */
function redirectCall(context, fn, arguments){
    var args = Array.prototype.slice.call(arguments);
    var func = context[fn];
    return func.apply(context, args);
}

/**
 * Returns the current auth state saved under the given path.
 * If there's no file or an invalid state, an empty object will be returned.
 * @param {string} path The file path to read.
 * @returns {{}}
 */
function getFileState(path){
    if(fs.existsSync(path)){
        try{
            return JSON.parse(
                fs.readFileSync(path, {encoding: 'utf8'}));
        }catch(err){ /* ignore parse errors */ }
    }

    return {};
}

/**
 * Writes the given state to a file. This method is async.
 * @param {string} path The path to write to.
 * @param {AuthState} state The state to write.
 */
function setFileState(path, state){
    fs.writeFile(path, JSON.stringify(state));
}

function AuthHandler(options){
    var _this = this,
        opts = extend({}, defaults, options);

    this.opts.authState =
        getFileState(opts.authFile);
    this.authProvider = new AuthProvider(opts);

    this.authProvider.on('statechanged',
        setFileState.bind(void 0, opts.authFile));

    this.opts = opts;
}

AuthHandler.prototype.token = function () {
    return redirectCall(this.authProvider, 'token', arguments);
};

AuthHandler.prototype.api = function () {
    return redirectCall(this.authProvider, 'api', arguments);
};