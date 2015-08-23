
module.exports = {
    fromServer: function(err, resp, body){
        if(err) return err;
        var b = {}, e;
        try{
            b = JSON.parse(body);
        }catch(ex){ }
        if(b.error){
            var msg = b.message || b.error_descripion;
            e = new Error(body.error + ': ' + msg);
        }else if(resp.statusCode >= 400 && resp.statusCode <= 599){
            e = new Error(resp.status);
        }
        e.status = resp.statusCode;
        return e;
    }
};