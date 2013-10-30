var cls = require("./lib/class");
var _ = require("underscore");
var ClanLoader = require('./clan_loader');
var shared = require('./shared');

module.exports = cls.Class.extend({
    init: function(isMaster){
        this.workers = {};
        this.isMaster = isMaster;
        this.controllers = require("./controllers");
    },

    loadModels: function() {
        var self = this;
        this.models = require("./models")(this.db, this);
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
    },

    processClans: function (clans, data){
        var IDs = _.pluck(clans,'id');
        var self = this;
        this.models.Players.where(['clan_id IN ?', IDs], function(err, players) {
            var clanPlayers = {};
            _.each(players, function(player){
                if(!clanPlayers[player.clan_id]){
                    clanPlayers[player.clan_id] = [];
                }
                clanPlayers[player.clan_id].push(player);
            });
            _.each(clans, function(clan){
                clan.members = clanPlayers[clan.id] || [];
                clan.update(data[clan.id], function(data) {
                    if(self.workers[self.worker_key].registeredCallback(clan.id)){
                        self.workers[self.worker_key].executeCallbacks(clan.id, data);
                    }
                });
            });
        });
    },

    addClan: function(id, callback) {
        var key;
        var region = shared.getRegion(id);
        if(region == shared.Regions.RU || region == shared.Regions.SEA || region == shared.Regions.KR){
            key = 'RU-SEA-KR';
        }else if(region == shared.Regions.NA){
            key = 'NA';
        }else if(region == shared.Regions.EU && id < 500016375){
            key = 'EU1';
        }else{
            key = 'EU2';
        }
        if(this.workers[key]){
            this.workers[key].addClan(id, callback);
        }else{
            this.messenger.addClan(key, id, callback);
        }
    }
});