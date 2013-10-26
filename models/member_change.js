var BaseModel = require('./base_model_Mongo');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            player_id: this.p,
            change: this.ch,
            updated_at: this.u
        };
    }

});