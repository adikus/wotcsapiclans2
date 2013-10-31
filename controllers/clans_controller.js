var cls = require("./../lib/class");
var BaseController = require('./base_controller');
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

        this.app.Clans.find(id, function(err, clan){
            if(clan){
                if(self.players){
                    finish(clan.getData(), self.players);
                }else{
                    self.clan = clan.getData();
                }
            }else{
                self.app.addClan(id, function(data){
                    if(!data.error){
                        finish(data.clan, data.players);
                    }else{
                        res.json({status: 'error', clan_id: id, error: data.error});
                    }
                });
            }
        });

        this.app.Players.inClan(id, function(err, players) {
            if(self.clan){
                finish(self.clan, players);
            }else{
                self.players = players;
            }
        });
    },

    changes: function (req, res) {
        var id = parseInt(req.params.id);
        this.app.MemberChanges.where({c: id}, function(err, changes) {
            res.json({status: 'ok', clan_id: id, changes: _.map(changes, function(change) {
                return change.getData();
            })});
        });
    }

});