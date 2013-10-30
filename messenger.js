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
        this.workersReady = {};
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
        this.workersReady[key] = false;

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
        if(action == MC.cluster.master.ADD_CLAN){
            var id = data;
            this.app.addClan(id, function(data) {
                data.id = id;
                process.send([MC.cluster.client.ADD_CLAN_RESPONSE, data]);
            });
        }
    },

    readyCount: function() {
        return _.reduce(this.workersReady, function(memo, ready){  return memo+(ready?1:0); }, 0);
    },

    handleWorkerMessage: function(key, msg) {
        var action = msg[0];
        var data = msg[1] || {};
        var self = this;
        var id = null;

        if(action == MC.cluster.client.GET_TASK){
            console.log('Worker '+key+' online, sending task');
            if((key == 'EU1' && this.workersReady['EU2'] == true)
                || (key == 'EU2' && this.workersReady['EU1'] == true)){
                var worker = this.workers[key];
                console.log('Desync',key,'by 1s');
                setTimeout(function(){
                    worker.send([0,key]);
                    self.workersReady[key] = true;
                    if(self.readyCount() == _.size(self.workers) && self.ready_callback){
                        self.ready_callback();
                    }
                }, 1000);
            }else{
                this.workersReady[key] = true;
                this.workers[key].send([0,key]);
                if(this.readyCount() == _.size(this.workers) && this.ready_callback){
                    this.ready_callback();
                }
            }
        }
        if(action == MC.cluster.client.WORKER_UPDATE){
            if(this.worker_update_callback){
                this.worker_update_callback(key, data);
            }
        }
        if(action == MC.cluster.client.ADD_CLAN_RESPONSE){
            id = data.id;
        }
        if(this.registeredCallback(key, action, id || 0)){
            this.executeCallbacks(key, action, id || 0, data);
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
        if(!this.registeredCallback(key, MC.cluster.master.GET_WORKER_DATA, 0)){
            this.workers[key].send([MC.cluster.master.GET_WORKER_DATA]);
        }
        this.registerCallback(key, MC.cluster.master.GET_WORKER_DATA, 0, callback);
    },

    addClan: function(key, id, callback){
        if(!this.registeredCallback(key, MC.cluster.client.ADD_CLAN_RESPONSE, id)){
            this.workers[key].send([MC.cluster.master.ADD_CLAN,id]);
        }
        this.registerCallback(key, MC.cluster.client.ADD_CLAN_RESPONSE, id, callback);
    },

    registeredCallback: function(key, action, id){
        return (this.callbacks[key] &&  this.callbacks[key][action] &&  this.callbacks[key][action][id]);
    },

    registerCallback: function(key, action, id, callback){
        if(!this.callbacks[key]){
            this.callbacks[key] = {};
        }
        if(!this.callbacks[key][action]){
            this.callbacks[key][action] = {};
        }
        if(!this.callbacks[key][action][id]){
            this.callbacks[key][action][id] = [];
        }
        this.callbacks[key][action][id].push(callback);
    },

    executeCallbacks: function(key, action, id, data){
        _.each(this.callbacks[key][action][id], function(callback){
            callback(data);
        });
        delete this.callbacks[key][action][id];
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