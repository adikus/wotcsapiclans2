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
            res.json({status: 'ok', clan_id: id, clan: clan, members: members});
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
        var id = parseInt(req.params.id);
        this.MemberChanges.where({c: id}, {order: {u: -1}}, function(err, changes) {
            res.json({status: 'ok', clan_id: id, changes: _.map(changes, function(change) {
                return change.getData();
            })});
        });
    }

});