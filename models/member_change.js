var BaseModel = require('wotcs-api-system').BaseModel('PG');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.player_id,
            name: this.player_name,
            joined: this.joined,
            changed_at: this.changed_at,
            previous: this.previous ? this.previous.getDataWRTPlayer() : undefined,
            next: this.next ? this.next.getDataWRTPlayer() : undefined
        };
    },

    getDataWRTPlayer: function() {
        return {
            clan_id: this.clan_id,
            clan_tag: this.clan_tag,
            clan_name: this.clan_name,
            joined: this.joined,
            changed_at: this.changed_at
        };
    }

});