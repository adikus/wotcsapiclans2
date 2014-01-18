var BaseModel = require('wotcs-api-system').BaseModel('PG');
var _ = require('underscore');
var Regions = require('../shared/regions');

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
                add[id] = comparison.parsed.account_name;
            }else if(!comparison.parsed && comparison.loaded){
                remove.push(comparison.loaded);
            }
        });
        if(_(data.members).size() == 0){
            console.log('Received empty members list for', this.tag, this.id);
            remove = [];
        }
        self.execChanges(add, remove);

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
        var addIDs = _.map(add, function(name, id){ return parseInt(id, 10); });
        var self = this;
        if(addIDs.length > 0){
            this.app.models.Players.where(['id IN ?', addIDs], function(err, players) {
                _.each(add, function(name, id) {
                    id = parseInt(id, 10);
                    var player = _.findWhere(players, {id: parseInt(id, 10)});
                    self.addPlayer(id, name, player);
                });
            });
        }
        _.each(remove, function(player){
            self.removePlayer(player);
        });
    },

    addPlayer: function(id, name, player) {
        var listOfAttributes = [];
        if(player){
            player.clan_id = this.id;
            listOfAttributes = ['clan_id'];
        }else{
            player = this.app.models.Players.new({
                id: id,
                name: name,
                clan_id: this.id,
                status: 0
            });
            listOfAttributes = ['clan_id','name','status'];
        }
        if(this.members.length > 0){
            console.log('Add player to clan', this.tag, ':', name, id);
            this.emit('add-player', {
                id: id,
                name: name,
                clan: {name: this.name, tag: this.tag, id: this.id, region: Regions.TranslatedRegion[Regions.getRegion(this.id)]}
            }, true);
            this.saveMemberChange(id, 1);
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
        this.saveMemberChange(player.id, -1);
    },

    saveMemberChange: function(id, ch) {
        var change = this.app.MemberChanges.new({p: id, c: this.id, ch: ch, u: new Date()});
        this.app.MemberChanges.where({p:id}, {order: {u: -1}, limit: 1}, function(err, changes) {
            var lastChange = changes[0];
            if(lastChange){
                if(lastChange.c != change.c || lastChange.ch != change.ch){
                    change.save(['p','c','ch','u']);
                }else{
                    console.log('Member change already exists for player:',change.p);
                }
            }else{
                change.save(['p','c','ch','u'], function(err){
                    if(err){
                        console.log(err);
                    }
                });
            }
        });
    }

});