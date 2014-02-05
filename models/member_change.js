var BaseModel = require('wotcs-api-system').BaseModel('PG');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.player_id,
            name: this.player_name,
            joined: this.joined,
            changed_at: this.getChangedAt(),
            accuracy: this.getAccuracy(),
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
            changed_at: this.getChangedAt(),
            accuracy: this.getAccuracy()
        };
    },

    getChangedAt: function() {
        if(!this.changed_at_max){ return this.changed_at; }
        var time1 = this.changed_at_max.getTime();
        var time2 = this.changed_at_max.getTime();
        return new Date((time1+time2)/2);
    },

    getAccuracy: function() {
        if(!this.changed_at_max){ return '?'; }
        var time1 = this.changed_at_max.getTime();
        var time2 = this.changed_at_max.getTime();
        return (time2-time1)/2000;
    }

});