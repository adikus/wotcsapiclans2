var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");
var Request = require("./request");
var Regions = require('./shared/regions');

module.exports = Eventer.extend({
    init: function(){
        this.config = {
            maxActiveRequests: 4,
            waitMultiplier: 1.05,
            minWaitTime: 650
        };

        this.stats = {
            finishedRequests: 0,
            errorRequests: 0,
            finishedClans: 0,
            start: new Date()
        };

        this.options = {
            type: 'clans'
        };

        this.newTasks = [];
        this.recentRequests = {};
        this.currentRequests = {};
        this.priorityRequests = [];
        this.interval = null;
        this.paused = false;
        this.requestID = 0;

        this.waitTime = 2000;
    },

    start: function(silent) {
        var self = this;
        this.paused = false;
        if(!silent){
            console.log('Worker started.');
            this.emit('start', true);
        }
        this.interval = setInterval(function() {self.step(); }, 10);
    },

    pause: function(pause, silent){
        if(pause && !this.paused){
            clearInterval(this.interval);
            this.paused = true;
            this.silentPause = silent;
            if(!silent){
                console.log('Worker paused.');
                this.emit('pause', true);
            }
        }else if(!pause && this.paused){
            this.start(silent);
        }
        return this.paused && !this.silentPause;
    },

    setModels: function(models) {
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    setTask: function(task) {
        var self = this;

        var taskID = _.keys(task)[0];
        task = task[taskID];
        this.Clans.inRegion(task.region,{order: 'id',limit: [task.skip, task.limit]}, function(err, clans) {
            var newTask = {
                ID: taskID,
                task: task,
                clans: clans
            };
            var count = clans.length;
            var done = 0;
            var loaded = 0;
            _.each(clans, function(clan){
                self.once('clans.'+clan.id+'.updated', function(event, data){
                    done++;
                    if(data.clan.status > -1){
                        loaded++;
                    }
                    if(done == count){
                        self.emit('finish-task', taskID, {count: loaded});
                    }
                });
            });
            self.newTasks.push(newTask);
            if(self.paused){
                self.pause(false, true);
            }
            if(self.interval === null){
                self.start();
            }
        });
    },

    getQueueOptions: function() {
        return this.options;
    },

    getCurrentState: function(options){
        var ret = {paused: this.paused && !this.silentPause, stats: this.stats};
        if(options && options.config){
            ret.config = this.getConfig();
        }
        return ret;
    },

    getConfig: function() {
        var ret = this.config;
        ret.paused = this.paused && !this.silentPause;
        return ret;
    },

    setConfig: function(config){
        _.each(config, function(value, name){
            if(name != 'paused'){
                this.config[name] = value;
            }else{
                this.pause(value)
            }
        },this);
        return this.getConfig();
    },

    addClan: function(id, callback){
        if(!this.waitingFor('clans.'+id+'.updated')){
            this.newTasks.push({
                ID: 'a'+this.requestID++,
                task: {region: Regions.getRegion(id)},
                clans: [this.Clans.new({id: id, status: 0})]
            });
        }
        this.once('clans.'+id+'.updated', function() {
            var args = _.toArray(arguments);
            args.shift();
            callback.apply(null, args);
        });
    },

    getLastRequestAt: function() {
        var obj = _.last(this.currentRequests) || _.last(this.recentRequests) || this.stats;
        return obj.start;
    },

    step: function() {
        var sinceLastRequest = (new Date()).getTime() - this.getLastRequestAt().getTime();

        if(_.size(this.currentRequests) < this.config.maxActiveRequests && sinceLastRequest > Math.max(this.waitTime,this.config.minWaitTime)){
            if(this.priorityRequests.length > 0){
                this.priorityRequests.pop()();
                return;
            }
            if(this.newTasks.length > 0){
                var clanList = [];
                var task = this.newTasks.shift();
                _.each(task.clans, function(clan){
                    if(clan.status > -1){
                        clanList.push(clan);
                    }else{
                        this.emit('clans.'+clan.id+'.updated', {
                            clan: clan.getData(),
                            players: []
                        });
                    }
                }, this);
                if(clanList.length > 0){
                    this.loadClans(clanList, task);
                }
            }else{
                this.pause(true, true);
                this.emit('ready', this.getQueueOptions(), false);
            }
        }
    },

    addRequest: function(task, clans){
        this.currentRequests[task.ID] = {
            start: new Date(),
            count: clans.length,
            task: {
                ID: task.ID,
                region: task.task ? Regions.TranslatedRegion[task.task.region] : 'Task Error',
                skip: task.task ? task.task.skip/task.task.limit : -1
            }
        };
        if(!task.task){
            console.log('No task',task);
        }
        this.emit('start-request', this.currentRequests[task.ID], true);
    },

    finishRequest: function(ID, error){
        if(!this.currentRequests[ID]){
            console.log(ID, this.currentRequests);
            return;
        }
        this.recentRequests[ID] = this.currentRequests[ID];
        delete this.currentRequests[ID];
        this.recentRequests[ID].end = new Date();
        this.recentRequests[ID].duration = this.recentRequests[ID].end.getTime() - this.recentRequests[ID].start.getTime();
        this.recentRequests[ID].error = error;

        this.stats.finishedClans += error ? 0 : this.recentRequests[ID].count;
        this.stats.finishedRequests += 1;
        if(error){
            this.stats.errorRequests += 1;
        }
        this.emit('update', this.getCurrentState(), true);

        this.waitTime = this.recentRequests[ID].duration*this.config.waitMultiplier/this.config.maxActiveRequests;

        this.emit('finish-request', this.recentRequests[ID], true);
    },

    parseData: function(data){
        try{
            return JSON.parse(data);
        }catch(e){
            return false;
        }
    },

    checkData: function(data, IDs) {
        if(data.status == 'ok'){
            _.each(IDs, function(ID){
                if(data.data[ID] === undefined){
                    return false;
                }
            });
            return true;
        }else{
            return false;
        }
    },

    loadClans: function(clans, task) {
        var ID = task.ID;
        var self = this;
        var IDs = _.map(clans, function(clan){return clan.id});

        this.addRequest(task, clans);
        var req = new Request('clan',IDs,'description_html,abbreviation,motto,name,members.account_name');

        req.onSuccess(function(data) {
            var parsedData = self.parseData(data);
            if(parsedData){
                if(self.checkData(parsedData, IDs)){
                    self.finishRequest(ID, false);
                    self.processClans(clans, parsedData.data);
                }else{
                    self.finishRequest(ID, parsedData.status + ' ' + JSON.stringify(parsedData.error));
                    self.emit('fail-task', ID);
                }
            }else{
                self.finishRequest(ID, 'Parse Error');
                self.emit('fail-task', ID);
            }
        });

        req.onError(function(error){
            self.finishRequest(ID, error);
            self.emit('fail-task', ID);
        });
    },

    processClans: function (clans, data){
        var IDs = _.pluck(clans,'id');
        var self = this;
        this.Players.where(['clan_id IN ?', IDs], function(err, players) {
            var clanPlayers = {};
            _.each(players, function(player){
                if(!clanPlayers[player.clan_id]){
                    clanPlayers[player.clan_id] = [];
                }
                clanPlayers[player.clan_id].push(player);
            });
            _.each(clans, function(clan){
                clan.members = clanPlayers[clan.id] || [];
                clan.on('*',function(){
                    var args = _.toArray(arguments);
                    var event = args.shift();
                    args.unshift('clans.'+clan.id+'.'+event);
                    self.emit.apply(self, args);
                });
                clan.update(data[clan.id]);
            });
        });
    }
});