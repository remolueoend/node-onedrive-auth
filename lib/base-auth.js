
module.exports = {
    getAuthToken: getAuthToken,
    getAccessToken: getAccessToken,
    getToken: getToken,
    getTokenByCode: getTokenByCode
};

var open = require('open'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    q = require('deferred'),
    http = require('http'),
    url = require('url'),
    extend = require('extend'),
    request = require('request'),

    // URL used to request a single access token or auth code:
    getTokenUrl = 'https://login.live.com/oauth20_authorize.srf?' +
        'client_id=%s&scope=%s&response_type=%s&redirect_uri=http://localhost:%d',

    // URL used to request a an access token over an auth code or refresh token.
    postUrl = 'https://login.live.com/oauth20_token.srf',
    
    // HTML template used to read out the access token hash on the redirect page.
    tokenTemplate = 
        '<html><body><script>\n' +
            'var xml = new XMLHttpRequest();\n' +
            'xml.open("POST", "http://localhost:%d");\n' +
            'xml.send(window.location.hash);\n' +
            'window.close();\n' +
        '</script></body></html>',

    codeTemplate =
        '<html><body><script>window.close();</script></body></html>',

    postDefs = {
        redirPort: 52763
    },

    tokenRequestDefs = extend({}, postDefs, {
        scope: []
    });

/**
 * Requests a new auth code.
 * See https://dev.onedrive.com/auth/msa_oauth.htm#code-flow
 * @param {object} [options] request options.
 * @returns {Promise} A promise resolving the requested code.
 */
function getAuthToken(options){
    return getToken(
        extend({}, options, {
            flow: 'code',
            page: codeTemplate
        }));
}

/**
 * Requests a new access token.
 * See https://dev.onedrive.com/auth/msa_oauth.htm#token-flow
 * @param {object} [options] request options.
 * @returns {Promise} A promise resolving the requested token.
 */
function getAccessToken(options){
    return getToken(
        extend({}, options, {
            flow: 'token',
            page: util.format(
                tokenTemplate, options.redirPort || tokenRequestDefs.redirPort)
        }));
}

/**
 * Requests an access token or an auth token,
 * depending on the option's flow property (code or token).
 * @param {object} [options] request options.
 * @returns {Promise} A promise resolving the requested token.
 */
function getToken(options){
    var opts = extend({}, tokenRequestDefs, options),
        browserUrl = util.format(
            getTokenUrl,
            opts.clientId,
            opts.scope.join(' '),
            options.flow,
            opts.redirPort);

    var prom = _atSrv(
        opts.redirPort,
        opts.page);
    open(browserUrl);
    return prom;
}

/**
 * Requests a new access token over an auth code
 * or a refresh token, depending on the provided options.
 * @param {object} [options] request options.
 * @returns {Promise} A rpmise resolving a token object.
 */
function getTokenByCode(options){
    var d = q(),
        opts = extend({}, postDefs, options),
        formData = {
            client_id: opts.clientId,
            redirect_uri: 'http://localhost:' + opts.redirPort,
            client_secret: opts.clientSecret
        };

    if(opts.refreshToken){
        formData['refresh_token'] = opts.refreshToken;
        formData['grant_type'] = 'refresh_token';
    }else if(opts.code){
        formData['code'] = opts.code;
        formData['grant_type'] = 'authorization_code';
    }else{
        throw 'Invalid options. Provide an auth code or a refresh token.';
    }

    request({
        url: postUrl,
        method: 'POST',
        form: formData
    }, function(err, resp, body){
        err = err || httpError.fromServer(err, resp, body);
        if(err) d.reject(err);
        d.resolve(JSON.parse(body));
    });

    return d.promise;
}

/**
 * Starts a new local webserver listening for incoming auth responses.
 * @param {number} port The port on which the server should be listening.
 * @param {string} page The page to render on a GET request.
 */
function _atSrv(port, page){
    var d = q(),
        _this = this;
    var server = http.createServer(function(req, res){
        if(req.method.toLocaleLowerCase() === 'get'){
            var urlData = url.parse(req.url, true);
            res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
            res.write(page);
            res.end();
            if(urlData.query.code){
                server.close();
                d.resolve(urlData.query.code);
            }
        }else{
            var raw = '';
            req.on('data', function(chunk){
                raw += chunk.toString();
            });
            req.on('end', function(){
                res.writeHead(200);
                res.end();
                server.close();

                raw = decodeURIComponent(raw.substring(1));
                var data = {};
                raw.split('&').forEach(function (d) {
                    var firstEqualIndex = d.indexOf('='),
                        key = d.substring(0, firstEqualIndex),
                        val = d.substring(firstEqualIndex + 1);
                    data[key] = val;
                });
                d.resolve(data);
            });
        }
    });
    server.listen(port);

    return d.promise;
}


