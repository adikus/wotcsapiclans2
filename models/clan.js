var BaseModel = require('wotcs-api-system').BaseModel('PG');
var _ = require('underscore');
var Regions = require('../shared/regions');
var fs = require('fs');

module.exports = Clan = BaseModel.extend({

    timestamps: true,

    getData: function() {
        return {
            name: this.name,
            description: this.description,
            motto: this.motto,
            tag: this.tag,
            status: this.status,
            updated_at: new Date(this.updated_at)
        };
    },

    update: function(data) {
        var self = this;

        if(data === null){
            this.status = -1;
            this.save(['status']);

            this.emit('updated', {
                clan: this.getData(),
                players: []
            });

            return;
        }

        this.tag = data.abbreviation;
        this.name = data.name;
        this.motto = data.motto;
        this.description = data.description_html;
        this.status = 1;

        var playersComparison = {};
        _.each(data.members, function(member, id){
            id = parseInt(id);
            playersComparison[id] = {};
            playersComparison[id].parsed = member;
        });
        _.each(this.members, function(member){
            var id = parseInt(member.id);
            if(!playersComparison[id]){
                playersComparison[id] = {};
            }
            playersComparison[id].loaded = member;
        });
        var add = {};
        var remove = [];
        _.each(playersComparison, function(comparison, id) {
            if(comparison.parsed && !comparison.loaded){
                add[id] = {name: comparison.parsed.account_name, joined_at: comparison.parsed.created_at }
            }else if(!comparison.parsed && comparison.loaded){
                remove.push(comparison.loaded);
            }
        });
        if(_(data.members).size() == 0){
            console.log('Received empty members list for', this.tag, this.id);
            remove = [];
        }else{
            self.execChanges(add, remove);
            self.createChanges(data.members);
        }

        self.forceChange = true;
        self.updated_at_before = self.updated_at;
        self.save(['tag', 'name', 'motto', 'description', 'status']);

        var players = [];
        _.each(data.members, function(member, id){
            players.push({
                id: id,
                name: member.account_name
            });
        });
        this.emit('updated', {
            clan: this.getData(),
            players: players
        });
    },

    execChanges: function(add, remove) {
        var addIDs = _.map(add, function(member, id){ return parseInt(id, 10); });
        var self = this;
        if(addIDs.length > 0){
            this.app.models.Players.where(['id IN ?', addIDs], function(err, players) {
                _.each(add, function(member, id) {
                    id = parseInt(id, 10);
                    var player = _.findWhere(players, {id: parseInt(id, 10)});
                    self.addPlayer(id, member, player);
                });
            });
        }
        _.each(remove, function(player){
            self.removePlayer(player);
        });
    },

    addPlayer: function(id, member, player) {
        var listOfAttributes = [];
        if(player){
            player.clan_id = this.id;
            listOfAttributes = ['clan_id'];
        }else{
            player = this.app.models.Players.new({
                id: id,
                name: member.name,
                clan_id: this.id,
                status: 0
            });
            listOfAttributes = ['clan_id','name','status'];
        }
        if(this.members.length > 0){
            console.log('Add player to clan', this.tag, ':', member.name, id);
            this.emit('add-player', {
                id: id,
                name: member.name,
                clan: {name: this.name, tag: this.tag, id: this.id, region: Regions.TranslatedRegion[Regions.getRegion(this.id)]}
            }, true);
        }
        player.save(listOfAttributes);
    },

    removePlayer: function(player) {
        console.log('Remove player from clan', this.tag, ':', player.name, player.id);
        this.emit('remove-player', {
            id: player.id,
            name: player.name,
            clan: {name: this.name, tag: this.tag, id: this.id, region: Regions.TranslatedRegion[Regions.getRegion(this.id)]}
        }, true);
        player.clan_id = 0;
        player.save(['clan_id']);
    },

    createChanges: function(members) {
        var self = this;
        fs.readFile('queries/last_player_changes.sql', function(err, data) {
            var sql = _(data.toString()).template()({ clan_id: self.id });
            self.app.MemberChanges.query(sql, function(err, changes) {
                var comparisons = {};
                _(members).each(function(member, id) {
                    comparisons[parseInt(id,10)] = {inClan: member};
                });
                _(changes).each(function(change) {
                    var id = parseInt(change.player_id,10);
                    if(!comparisons[id]){ comparisons[id] = {}; }
                    comparisons[id].change = change;
                });
                _(comparisons).each(function(comparison, id) {
                    var change = self.app.MemberChanges.new({
                        player_id: id,
                        clan_id: self.id
                    });
                    if(comparison.inClan){
                        if(comparison.change){
                            comparison.change.compare(id, self.id, comparison, change);
                        }else{
                            change.joinAt(new Date(comparison.inClan.created_at*1000));
                        }
                    }else{
                        if(comparison.change.joined){
                            if(comparison.change.clan_id == self.id){
                                change.leaveAt(new Date(), new Date(self.updated_at_before));
                            }
                        }
                    }
                });
            });
        });
    },

    loadOldChanges: function() {
        var self = this;
        this.app.OldMemberChanges.where({c: this.id}, {order: {u: 1}}, function(err, changes) {
            var filteredChanges = self.filterChanges(changes);
            var overallChanges = {};
            self.app.MemberChanges.where(['clan_id = ?', self.id], {order: 'changed_at'}, function(err, PGChanges) {
                _(filteredChanges).each(function(change) {
                    if(!overallChanges[change.p]){overallChanges[change.p] = [];}
                    overallChanges[change.p].push(self.app.MemberChanges.new({
                        player_id: change.p, clan_id: change.c, joined: change.ch > 0, changed_at: (new Date(change.u)).toISOString()
                    }));
                });
                _(PGChanges).each(function(change) {
                    if(!overallChanges[change.player_id]){overallChanges[change.player_id] = [];}
                    overallChanges[change.player_id].push(change);
                });
                overallChanges = _(overallChanges).map(function(changes) {
                    return changes.sort(function(ch1, ch2) {
                        return (new Date(ch2.changed_at)).getTime() - (new Date(ch1.changed_at)).getTime();
                    });
                });
                _(overallChanges).each(function(changes) {
                    for(var i in changes){
                        if(changes[i] && changes[i+1] && changes[i].joined == changes[i+1].joined){
                            if(changes[i+1].id){
                                self.app.MemberChanges.query('DELETE FROM changes WHERE id = '+changes[i+1].id, function(err){
                                    if(err)console.log(err);
                                });
                            }
                            changes[i+1] = null;
                        }else if(changes[i] && changes[i].newRecord){
                            changes[i].save(['player_id','clan_id','joined','changed_at'], function(err){
                                if(err){
                                    console.log(err);
                                }
                            });
                        }
                    }
                });
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