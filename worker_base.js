var cls = require("./lib/class");
var _ = require("underscore");

module.exports = cls.Class.extend({

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    },

    start: function() {
        console.log('Worker started.',this.key || this.config.key);
        var self = this;
        this.workerStart = new Date();
        this.interval = setInterval(function() {self.step(); }, 10);
    },

    onReady: function(callback){
        if(this.ready){
            callback();
        }else{
            this.ready_callback = callback;
        }
    }
});