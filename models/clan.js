var BaseModel = require('./base_model_PG');
var _ = require('underscore');

module.exports = BaseModel.extend({

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
    }

});