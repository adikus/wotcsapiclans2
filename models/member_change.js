var BaseModel = require('wotcs-api-system').BaseModel('Mongo');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.p,
            name: this.name,
            change: this.ch,
            updated_at: this.u
        };
    }

});