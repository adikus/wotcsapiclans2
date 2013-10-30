var BaseCollection = require('./base_collection_PG');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    name: 'Player',
    tableName: 'players',

    inClan: function (id, callback) {
        this.where(['clan_id = ?', id], callback);
    }

});