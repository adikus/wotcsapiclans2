var cls = require("./lib/class");
var _ = require("underscore");
var ClanLoader = require('./clan_loader');

module.exports = cls.Class.extend({
    init: function(isMaster){
        this.workers = {};
        this.isMaster = isMaster;
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    },

    addWorker: function(key) {
        var worker = new ClanLoader(key);
        this.worker_key = key;
        worker.dependencies({
            app: this
        });
        worker.loadData();
        worker.onReady(function(){
            worker.start();
        });
        this.workers[key] = worker;
    },

    homepage: function(req, res){
        var key = req.query.key || 'EU1';
        this.getWorkerData(key, function(data) {
            data.key = key;
            res.render('index', data);
        });
    },

    onWorkerUpdate: function(callback) {
        var self = this;

        if(this.worker_key){
            this.workers[this.worker_key].onUpdate(function(data){
                callback(self.worker_key, data);
            });
        }
        if(this.isMaster){
            this.messenger.onWorkerUpdate(function(key, data){
                callback(key, data);
            });
        }
    },

    getWorkerData: function (key, callback){
        if(this.workers[key]){
            var ret = this.workers[key].getCurrentState();
            ret.lastRequests = this.workers[key].lastRequests;
            callback(ret);
        }else{
            this.messenger.getWorkerData(key, callback);
        }
    }
});