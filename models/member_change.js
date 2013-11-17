var BaseModel = require('wotcs-api-system').BaseModel('Mongo');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.p,
            name: this.name,
            change: this.ch,
            updated_at: this.u,
            previous: this.previous ? this.previous.getDataWRTPlayer() : undefined,
            next: this.next ? this.next.getDataWRTPlayer() : undefined
        };
    },

    getDataWRTPlayer: function() {
        return {
            clan_id: this.c,
            clan: this.clan,
            change: this.ch,
            updated_at: this.u
        };
    }

});