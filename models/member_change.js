var BaseModel = require('wotcs-api-system').BaseModel('PG');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.player_id,
            name: this.player_name,
            joined: this.joined,
            changed_at: this.changed_at,
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
            changed_at: this.changed_at,
            accuracy: this.getAccuracy()
        };
    },

    getAccuracy: function() {
        if(!this.changed_at_max){ return '?'; }
        var time1 = this.changed_at.getTime();
        var time2 = this.changed_at_max.getTime();
        return (time2-time1)/1000;
    },

    compare: function(id, clan_id, comparison, change) {
        var self = this;
        var joined_at = new Date(comparison.inClan.joined_at*1000);
        var changed_at = new Date(comparison.change.changed_at);
        var diff = joined_at.getTime() - changed_at.getTime();
        if(comparison.change.joined){
            if(comparison.change.clan_id != clan_id){
                if(diff > 0){
                    change.joinAt(joined_at);
                }else{
                    self.remove();
                }
            }
        }else{
            if(comparison.change.clan_id == clan_id){
                if(diff > 0){
                    change.joinAt(joined_at);
                }else{
                    self.remove();
                }
            }else{
                if(diff < 0){
                    self.remove();
                }else{
                    change.joinAt(joined_at);
                }
            }
        }
    },

    joinAt: function(time) {
        this.joined = true;
        this.changed_at = time.toISOString();
        this.changed_at_max = time.toISOString();
        this.save(['player_id','clan_id','joined','changed_at','changed_at_max'], function(err){
            if(err){
                console.log(err);
            }
        });
    },

    leaveAt: function(time, max) {
        this.joined = false;
        this.changed_at = time.toISOString();
        this.changed_at_max = max ? max.toISOString() : null;
        this.save(['player_id','clan_id','joined','changed_at','changed_at_max'], function(err){
            if(err){
                console.log(err);
            }
        });
    }

});