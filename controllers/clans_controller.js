var BaseController = require('wotcs-api-system').BaseController;
var _ = require('underscore');
var fs = require('fs');

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
            /*self.store(ret, 10*60*1000);
            self.updateStoreOn('workers.*.clans.'+id+'.updated', function(event, data) {
                console.log('Updated data store for clan',id);
                this.data.clan = data.clan;
                this.data.members = data.players;
            });*/
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
        if(month !== undefined){
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth() - month, 1);
            var lastDay = new Date(date.getFullYear(), date.getMonth() - month + 1, 1);
            var month_where = "changed_at > '"+firstDay.toISOString()+"' AND changed_at < '"+lastDay.toISOString()+"'";
        }
        fs.readFile('queries/select_changes.sql', function(err, template) {
            var sql = _(template.toString()).template({clan_id: id, month_where: month_where || 'true'});
            self.MemberChanges.query(sql, function(err, changes) {
                var ret = {changes: changes};
                var finish = _.after(3, function(){self.combineChanges(ret)});
                fs.readFile('queries/change_limits.sql', function(err, template) {
                    var sql = _(template.toString()).template({clan_id: id});
                    self.MemberChanges.db.query(sql, function(err, limits) {
                        var min = limits.rows[0].min;
                        var max = limits.rows[0].max;
                        var now = new Date();
                        var months = (now.getFullYear() - min.getFullYear()) * 12 - min.getMonth() + now.getMonth();
                        ret.nav = {max: months};
                        months = (now.getFullYear() - max.getFullYear()) * 12 - max.getMonth() + now.getMonth();
                        ret.nav.min = months;
                        ret.nav.current = month;
                        finish();
                    });
                });
                var players_where = [];
                _(changes).each(function(change){
                    if(change.joined){
                        players_where.push('player_id = '+change.player_id+" AND changed_at < '"+change.changed_at.toISOString()+"'");
                    }
                });
                if(players_where.length == 0){
                    finish();
                }else{
                    fs.readFile('queries/prev_changes.sql', function(err, template) {
                        var sql = _(template.toString()).template({clan_id: id, where: players_where.join(' OR ')});
                        self.MemberChanges.query(sql, function(err, prev) {
                            ret.prev = prev;
                            finish();
                        });
                    });
                }
                var players_where_next = [];
                _(changes).each(function(change){
                    if(!change.joined){
                        players_where_next.push('player_id = '+change.player_id+" AND changed_at > '"+change.changed_at.toISOString()+"'");
                    }
                });
                if(players_where_next.lenth == 0){
                    finish();
                }else{
                    fs.readFile('queries/next_changes.sql', function(err, template) {
                        var sql = _(template.toString()).template({clan_id: id, where: players_where_next.join(' OR ')});
                        self.MemberChanges.query(sql, function(err, next) {
                            ret.next = next;
                            finish();
                        });
                    });
                }
            });
        });

    },

    combineChanges: function(ret) {
        var self = this;
        _(ret.prev).each(function(p) {
            for(var i = ret.changes.length -1; i >= 0; i--){
                var ch = ret.changes[i];
                if(ch.player_id == p.player_id && p.changed_at < ch.changed_at && ch.joined){
                    ch.previous = p;
                    break;
                }
            }
        });
        _(ret.next).each(function(n) {
            for(var i in ret.changes){
                var ch = ret.changes[i];
                if(ch.player_id == n.player_id && n.changed_at > ch.changed_at && !ch.joined){
                    ch.next = n;
                    break;
                }
            }
        });
        this.res.json({changes: _(ret.changes).invoke('getData'), navigation: ret.nav});
    }

});