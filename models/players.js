var BaseCollection = require('wotcs-api-system').BaseCollection('PG');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    dbName: 'MainDB',

    inClan: function (id, callback) {
        this.where(['clan_id = ?', id], callback);
    }

});