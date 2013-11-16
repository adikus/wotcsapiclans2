Request = Class.extend({

    init: function(method, IDs, fields) {
        this.data = '';

        var host = this.getHost(IDs[0]);
        var api_id = this.getApiId(IDs[0]);
        var IDString = IDs.join(',');

        var path = '/2.0/'+method+'/info/?application_id='+api_id+'&clan_id='+IDString;
        if(fields){
            path += '&fields='+fields;
        }
        var	self = this;

        $.ajax({
            url: 'http://'+host+path,
            dataType: 'json',
            success: function(data){
                self.success_callback(data);
            },
            error: function(jqXHR, textStatus) {
                self.error_callback(textStatus);
            }
        });
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