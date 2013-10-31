var BaseModel = require('./base_model_PG');
var _ = require('underscore');
var MC = require("./../message_codes");
var shared = require("./../shared");

module.exports = BaseModel.extend({

    timestamps: true,

    getData: function() {
        return {
            name: this.name,
            description: this.description,
            motto: this.motto,
            name: this.name,
            tag: this.tag,
            status: this.status,
            updated_at: new Date(this.updated_at)
        };
    },

    update: function(data, callback) {
        var self = this;

        if(data === null){
            this.status = -1;
            this.save(['status']);
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
        self.execChanges(add, remove);

        self.save(['tag', 'name', 'motto', 'description', 'status']);

        if(callback){
            var players = [];
            _.each(data.members, function(member, id){
                players.push({
                    id: id,
                    name: member.account_name
                });
            });
            callback({
                clan: this.getData(),
                players: players
            });
        }
    },

    execChanges: function(add, remove) {
        var addIDs = _.map(add, function(name, id){ return id; });
        var self = this;
        if(addIDs.length > 0){
            this.app.models.Players.where(['id IN ?', addIDs], function(err, players) {
                _.each(add, function(name, id) {
                    var player = _.findWhere(players, {id: id});
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
            console.log('Add player to clan', this.tag, ':', name);
            this.app.update_callback({key: this.app.worker_key, actionData: {
                code: MC.ws.server.MEMBER_JOINED,
                id: id,
                name: name,
                clan: {name: this.name, tag: this.tag, id: this.id, region: shared.TranslatedRegion[shared.getRegion(this.id)]}
            }});
            //TODO add member change
        }
        player.save(listOfAttributes);
    },

    removePlayer: function(player) {
        console.log('Remove player from clan', this.tag, ':', player.name);
        this.app.update_callback({key: this.app.worker_key, actionData: {
            code: MC.ws.server.MEMBER_LEFT,
            id: player.id,
            name: player.name,
            clan: {name: this.name, tag: this.tag, id: this.id, region: shared.TranslatedRegion[shared.getRegion(this.id)]}
        }});
        player.clan_id = 0;
        player.save(['clan_id']);
        //TODO add member change
    }

});