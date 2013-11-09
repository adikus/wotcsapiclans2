var BaseModel = require('wotcs-api-system').BaseModel('Mongo');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.p,
            change: this.ch,
            updated_at: this.u
        };
    }

});