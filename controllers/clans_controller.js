var cls = require("./../lib/class");
var BaseController = require('./base_controller');
var _ = require('underscore');

module.exports = BaseController.extend({

    index: function () {
        var self = this;
        var id = parseInt(this.req.params.id,10);
        if(isNaN(id)){
            this.res.json({status: 'error', error:"Bad clan id"});
            return;
        }

        var finish = function(clan, players) {
            var members = _.map(players, function(player) {
                return _.pick(player, 'id', 'name');
            });
            if(clan.getData){
                clan = clan.getData();
            }
            self.res.json({status: 'ok', clan_id: id, clan: clan, members: members});
        };

        this.app.Clans.find(id, function(err, clan){
            if(clan){
                if(self.players){
                    finish(clan, self.players);
                }else{
                    self.clan = clan;
                }
            }else{
                self.app.addClan(id, function(data){
                    if(!data.error){
                        finish(data.clan, data.players);
                    }else{
                        self.res.json({status: 'error', clan_id: id, error: data.error});
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

    changes: function () {
        var id = parseInt(this.req.params.id);
        var self = this;
        this.app.MemberChanges.where({c: id}, function(err, changes) {
            self.res.json({status: 'ok', clan_id: id, changes: _.map(changes, function(change) {
                return change.getData();
            })});
        });
    }

});