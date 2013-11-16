var Eventer = require('wotcs-api-system').Eventer;
var _ = require("underscore");
var Regions = require('./shared/regions');

module.exports = Eventer.extend({
    init: function(options){
        this.tasks = {};
        this.options = options;
    },

    setModels: function(models) {
        this.models = models;
        _.each(this.models,  function(model, name) {
            this[name] = model;
        },this);
    },

    setTask: function(task, callback) {
        var self = this;

        var taskID = _.keys(task)[0];
        task = task[taskID];
        if(!task){
            console.log('Set task, but it is undefined:',taskID);
            return;
        }
        this.Clans.inRegion(task.region,{order: 'id',limit: [task.skip, task.limit]}, function(err, clans) {
            var goodClans = [];

            _.each(clans, function(clan){
                if(clan.status > -1){
                    goodClans.push(clan);
                }
            });
            var count = goodClans.length;
            var done = 0;
            _.each(goodClans, function(clan){
                self.once('clans.'+clan.id+'.updated', function(){
                    done++;
                    if(done == count){
                        self.emit('finish-task', taskID, {count: done});
                    }
                });
            });
            if(done == count){
                self.emit('finish-task', taskID, {count: done});
                self.emit('ready', self.options);
                return;
            }

            var newTask = {
                ID: taskID,
                region: Regions.TranslatedRegion[task.region],
                skip: task.skip/task.limit,
                clans: _(goodClans).map(function(clan){return clan.id;})
            };
            callback(newTask);
            newTask.clans = goodClans;
            self.tasks[taskID] = newTask;
        });
    },

    getUnfinishedTasks: function() {
        return _(this.tasks).keys();
    },

    processTask: function (ID, data){
        if(!this.tasks[ID]){
            console.log('No such task:',ID);
            return;
        }
        var clans = this.tasks[ID].clans;
        delete this.tasks[ID];
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