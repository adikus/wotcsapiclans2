var cls = require("./lib/class");
var _ = require("underscore");

module.exports = cls.Class.extend({
    init: function(){
        this.workers = [];
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
    },

    addWorker: function(worker) {
        worker.dependencies({
            app: this
        });
        worker.loadData();
        worker.onReady(function(){
            worker.start();
        });
        this.workers.push(worker);
    },

    homepage: function(req, res){
        var locals = this.workers[0].getCurrentState();
        res.render('index', locals);
    },

    onWorkerUpdate: function(callback) {
        this.workers[0].onUpdate(function(data){
            callback(data);
        });
    },

    getWorkerData: function (){
        var ret = this.workers[0].getCurrentState();
        ret.lastRequests = this.workers[0].lastRequests;
        return ret;
    }
});