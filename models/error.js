var BaseModel = require('wotcs-api-system').BaseModel('Mongo');

module.exports = BaseModel.extend({

    getData: function() {
        return {
            error: this.e,
            time: this.t
        };
    }

});