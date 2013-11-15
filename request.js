var cls = require("./lib/class"),
    _ = require("underscore"),
    http = require("http");

module.exports = Request = cls.Class.extend({
    init: function(method,IDs,fields){
        this.data = '';

        this.IDs = IDs.toString();
        this.host = this.getHost(this.IDs.split(',')[0]);
        this.api_id = this.getApiId(this.IDs.split(',')[0]);
        this.path = '/2.0/'+method+'/info/?application_id='+this.api_id+'&clan_id='+this.IDs;
        if(fields){
            this.path += '&fields='+fields;
        }
        var	self = this,
            options = {
                host: this.host,
                port: 80,
                path: this.path,
                method: 'GET'
            };

        this.request = http.request(options, function(res) {
            var error = res.statusCode != 200;
            if(error && res.statusCode != 503){
                console.log(res.statusCode, this.path);
            }

            res.on('data', function (chunk) {
                if(!error){
                    self.data += chunk.toString('utf8');
                }
            });

            res.on('end', function (chunk) {
                if(!error){
                    if(chunk){
                        self.data += chunk.toString('utf8');
                    }
                    if(self.success_callback){
                        self.success_callback(self.data);
                    }
                }else {
                    if(self.error_callback){
                        self.error_callback(res.statusCode);
                    }
                }
            });
        });

        this.request.on('error', function(e) {
            console.log('Problem with request: ' + e.message);
            self.error_callback(e.message);
        });

        this.request.end();
    },

    onSuccess: function(callback){
        this.success_callback = callback;
    },

    onError: function(callback){
        this.error_callback = callback;
    },

    getHost: function(id) {
        if(id > 3000000000){return "api.worldoftanks.kr";}
        if(id > 2500000000){return "portal-wot.go.vn";}
        if(id > 2000000000){return "api.worldoftanks.asia";}
        if(id > 1000000000){return "api.worldoftanks.com";}
        if(id > 500000000){return "api.worldoftanks.eu";}
        return "api.worldoftanks.ru";
    },

    getApiId: function(id) {
        if(id > 3000000000){return "ffea0f1c3c5f770db09357d94fe6abfb";}
        if(id > 2500000000){return "?";}
        if(id > 2000000000){return "39b4939f5f2460b3285bfa708e4b252c";}
        if(id > 1000000000){return "16924c431c705523aae25b6f638c54dd";}
        if(id > 500000000){return "d0a293dc77667c9328783d489c8cef73";}
        return "171745d21f7f98fd8878771da1000a31";
    }
});