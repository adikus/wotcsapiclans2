var cls = require("./lib/class");
var _ = require("underscore");
var MC = require("./message_codes");

module.exports = cls.Class.extend({
    init: function(isMaster){
        this.isMaster = isMaster;
        this.workers = {};
        if(!this.isMaster){
            this.setupMaster();
        }
        this.callbacks = {};
        this.workersReady = 0;
    },

    setupMaster: function() {
        var self = this;

        process.send([MC.cluster.client.GET_TASK]);

        process.on('message', function(msg) {
            self.handleMasterMessage(msg);
        });
    },

    setupWorker: function(worker, key) {
        var self = this;

        this.workers[key] = worker;

        worker.on('message', function(msg) {
            self.handleWorkerMessage(key, msg);
        });
    },

    handleMasterMessage: function(msg) {
        var action = msg[0];
        var data = msg[1] || {};

        if(action == MC.cluster.master.ASSIGN_TASK){
            console.log('Task received',msg);
            this.app.addWorker(data);
            this.app.onWorkerUpdate(function(key, workerData){
                process.send([MC.cluster.client.WORKER_UPDATE, workerData]);
            });
        }
        if(action == MC.cluster.master.GET_WORKER_DATA){
            this.app.getWorkerData(this.app.worker_key, function(data) {
                process.send([MC.cluster.client.SEND_WORKER_DATA, data]);
            });
        }
    },

    handleWorkerMessage: function(key, msg) {
        var action = msg[0];
        var data = msg[1] || {};

        if(action == MC.cluster.client.GET_TASK){
            console.log('Worker '+key+' online, sending task');
            this.workersReady++;
            if(this.workersReady == _.size(this.workers) && this.ready_callback){
                this.ready_callback();
            }
            this.workers[key].send([0,key]);
        }
        if(action == MC.cluster.client.WORKER_UPDATE){
            if(this.worker_update_callback){
                this.worker_update_callback(key, data);
            }
        }
        if(this.registeredCallback(key, action)){
            this.executeCallbacks(key, action, data);
        }
    },

    dependencies: function(dependencies){
        var self = this;
        _.each(dependencies,function(dep, name){
            self[name] = dep;
        });
        if(this.dependencies_callback){
            this.dependencies_callback();
        }
    },

    getAllWorkersData: function(callback){
        var done = 0;
        var self = this;

        _.each(this.workers, function(worker, key) {
            self.getWorkerData(key, function(data) {
                done++;
                callback(key, data, done == _.size(self.workers));
            });
        });
    },

    getWorkerData: function(key, callback){
        if(!this.workers[key]){
            callback({error: 'Worker not found'});
            return;
        }
        if(!this.registeredCallback(key, MC.cluster.master.GET_WORKER_DATA)){
            this.workers[key].send([MC.cluster.master.GET_WORKER_DATA]);
        }
        this.registerCallback(key, MC.cluster.master.GET_WORKER_DATA, callback);
    },

    registeredCallback: function(key, action){
        return (this.callbacks[key] &&  this.callbacks[key][action]);
    },

    registerCallback: function(key, action, callback){
        if(!this.callbacks[key]){
            this.callbacks[key] = {};
        }
        if(!this.callbacks[key][action]){
            this.callbacks[key][action] = [];
        }
        this.callbacks[key][action].push(callback);
    },

    executeCallbacks: function(key, action, data){
        _.each(this.callbacks[key][action], function(callback){
            callback(data);
        });
        delete this.callbacks[key][action];
    },

    onDependencies: function(callback) {
        this.dependencies_callback = callback;
    },

    onWorkersReady: function(callback){
        this.ready_callback = callback;
    },

    onWorkerUpdate: function(callback){
        this.worker_update_callback = callback;
    }
});