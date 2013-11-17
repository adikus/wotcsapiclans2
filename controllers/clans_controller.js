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
            var filteredChanges = [];
            var playerChanges = {};

            _(changes.reverse()).each(function(change){
                if(!playerChanges[change.p]){
                    playerChanges[change.p] = [change];
                    filteredChanges.push(change);
                }else{
                    var last = _(playerChanges[change.p]).last();
                    if(last.ch != change.ch){
                        playerChanges[change.p].push(change);
                        filteredChanges.push(change);
                    }
                }
            });

            var names = {};
            self.Players.where(['id IN ?', _(playerChanges).keys()], function(err, players) {
                names = _.object(_(players).pluck('id'),_(players).pluck('name'));
                _(filteredChanges).each(function(change){ change.name = names[change.p]; });

                res.json({status: 'ok', clan_id: id, changes: _.map(filteredChanges.reverse(), function(change) {
                    return change.getData();
                })});
            });
        });
    }

});