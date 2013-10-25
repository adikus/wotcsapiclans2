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

    getAllWorkerKeys: function() {
        var ret  = _.keys(this.messenger.workers);
        if(this.worker_key){
            ret.push(this.worker_key);
        }
        return ret;
    },

    homepage: function(req, res){
        var key = req.query.key || 'all';
        if(key == 'all'){
            this.getAllWorkersData(function(data) {
                data.key = key;
                data.title = 'Clan loader';
                res.render('all', data);
            });
        }else{
            this.getWorkerData(key, function(data) {
                data.key = key;
                data.title = 'Clan loader';
                res.render('index', data);
            });
        }
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

    getAllWorkersData: function (callback) {
        var ret = {};
        if(this.worker_key){
            ret[this.worker_key] = this.workers[this.worker_key].getCurrentState();
            ret[this.worker_key].lastRequests = this.workers[this.worker_key].lastRequests;
        }
        this.messenger.getAllWorkersData(function(key, data, done){
            ret[key] = data;
            if(done){
                callback(ret);
            }
        });
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