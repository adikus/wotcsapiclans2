var BaseCollection = require('./base_collection_PG');
var _ = require('underscore');

module.exports = BaseCollection.extend({

    name: 'Clan',
    tableName: 'clans',

    whereIDsBetween: function( range, callback ) {
        var where = [];
        if(!_.isArray(range[0])){
            range = [range];
        }
        where[0] = _.map(range, function() {
            return "(id >= ? AND id < ?)";
        }).join(' OR ');
        _.each(range, function(r){
            where.push(r[0], r[1]);
        });

        this.where(where, {order: 'id'}, callback);
    }

});