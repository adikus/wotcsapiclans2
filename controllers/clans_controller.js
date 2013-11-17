var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function (req, res) {
        var self = this;
        var id = parseInt(req.params.id,10);
        if(isNaN(id)){
            res.json({status: 'error', error:"Bad clan id"});
            return;
        }

        var finish = function(clan, players) {
            var members = _.map(players, function(player) {
                return _.pick(player, 'id', 'name');
            });
            var ret = {status: 'ok', clan_id: id, clan: clan, members: members};
            self.store(ret, 10*60*1000);
            self.updateStoreOn('workers.*.clans.'+id+'.updated', function(event, data) {
                console.log('Updated data store for clan',id);
                this.data.clan = data.clan;
                this.data.members = data.players;
            });
            res.json(ret);
        };

        this.Clans.find(id, function(err, clan){
            if(clan){
                if(self.players){
                    finish(clan.getData(), self.players);
                }else{
                    self.clan = clan.getData();
                }
            }else{
                self.workerManager.workers[0].executeAsync('addClan', id, function(data){
                    if(!data.error){
                        finish(data.clan, data.players);
                    }else{
                        res.json({status: 'error', clan_id: id, error: data.error});
                    }
                });
            }
        });

        this.Players.inClan(id, function(err, players) {
            if(self.clan){
                finish(self.clan, players);
            }else{
                self.players = players;
            }
        });
    },

    changes: function (req, res) {
        var self = this;
        var id = parseInt(req.params.id);
        var month = req.params.month;
        var where = {c: id};
        if(month !== undefined){
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth() - month, 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() - month + 1, 1);
            where.u = {$gte: firstDay, $lt: lastDay};
        }
        this.MemberChanges.where(where, {order: {u: -1}}, function(err, changes) {
            var filteredChangesReverse = self.filterChanges(changes);
            changes.reverse()
            var filteredChanges = self.filterChanges(changes);

            self.Players.where(['id IN ?', _(filteredChanges).pluck('p')], function(err, players) {
                var names = _.object(_(players).pluck('id'),_(players).pluck('name'));
                _(filteredChanges).each(function(change){ change.name = names[change.p]; });

                var toDo = 0;
                var cIDs = [];
                if(req.query.previous){
                    toDo++;
                    self.MemberChanges.getPrevious(filteredChanges, function(previous) {
                        cIDs = _.union(cIDs, _(previous).pluck('c'));
                        var prev = _.object(_(previous).pluck('p'),previous);
                        _(filteredChanges).each(function(change){
                            change.previous = change.ch == 1 ? prev[change.p] : undefined;
                        });
                        finish();
                    });
                }
                if(req.query.next){
                    toDo++;
                    self.MemberChanges.getNext(filteredChangesReverse, function(next) {
                        cIDs = _.union(cIDs, _(next).pluck('c'));
                        var next = _.object(_(next).pluck('p'),next);
                        _(filteredChanges).each(function(change){
                            change.next = change.ch == -1 ? next[change.p] : undefined;
                        });
                        finish();
                    });
                }
                var finish = _.after(toDo, function(){
                    if(cIDs.length > 0){
                        self.Clans.where(['id IN ?', cIDs], function(err, clans) {
                            var clans = _.object(_(clans).pluck('id'),_(clans).map(function(clan){
                                return {tag: clan.tag, name: clan.name};
                            }));
                            _(filteredChanges).each(function(change){
                                if(change.previous){
                                    change.previous.clan = clans[change.previous.c];
                                }
                                if(change.next){
                                    change.next.clan = clans[change.next.c];
                                }
                            });

                            res.json({status: 'ok', clan_id: id, changes: _.map(filteredChanges, function(change) {
                                return change.getData();
                            })});
                        });
                    }else{
                        res.json({status: 'ok', clan_id: id, changes: _.map(filteredChanges, function(change) {
                            return change.getData();
                        })});
                    }
                });
                if(toDo == 0){
                    finish();
                }
            });
        });
    },

    filterChanges: function(changes) {
        var ret = [];
        var playerChanges = {};
        _(changes).each(function(change){
            if(!playerChanges[change.p]){
                playerChanges[change.p] = [{u:change.u,ch:change.ch}];
                ret.push(change);
            }else{
                var last = _(playerChanges[change.p]).last();
                if(last.ch != change.ch){
                    playerChanges[change.p].push({u:change.u,ch:change.ch});
                    ret.push(change);
                }
            }
        });
        return ret.reverse();
    }

});