var cls = require("./lib/class");
var _ = require("underscore");
var ClanLoader = require('./clan_loader');

module.exports = cls.Class.extend({
    init: function(isMaster){
        this.workers = {};
        this.isMaster = isMaster;
        this.controllers = require("./controllers");
    },

    loadModels: function() {
        var self = this;
        this.models = require("./models")(this.db);
        _.each(this.models,  function(model, name) {
            self[name] = model;
        });
    },

    handleAction: function(controllerName, actionName, req, res) {
        if(!this.controllers[controllerName]){
            res.render('index', {error: 'Controller not found('+controllerName+').'});
            return;
        }
        var controller = new this.controllers[controllerName];
        controller.dependencies({
            app: this,
            res: res,
            req: req
        });
        controller.callAction(actionName);
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